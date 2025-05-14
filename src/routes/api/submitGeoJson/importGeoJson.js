// importGeoJson.js
// Standalone script to import GeoJSON and print/write a condensed error summary
// TO RUN GO:  node src/routes/api/submitGeoJson/importGeoJson.js

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importGeoJson(filePath) {
  const geoJsonPath = filePath || path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');
  let geoJsonData;
  try {
    const fileData = fs.readFileSync(geoJsonPath, 'utf8');
    geoJsonData = JSON.parse(fileData);
  } catch (e) {
    console.error('Could not read or parse GeoJSON file:', geoJsonPath, e.message);
    process.exit(1);
  }

  const errorMap = {};
  let successCount = 0;

  function logError(type, attribute, value, error) {
    const key = `${type}:${attribute}`;
    if (!errorMap[key]) errorMap[key] = { count: 0, examples: [] };
    errorMap[key].count++;
    if (errorMap[key].examples.length < 3) {
      errorMap[key].examples.push({ value, error });
    }
  }

  // Process each organization
  for (const org of geoJsonData.organizations) {
    let organization;
    try {
      organization = await prisma.organizations.findFirst({ where: { organizationName: org.organization_name } });
      if (!organization) {
        organization = await prisma.organizations.create({
          data: {
            organizationName: org.organization_name,
            contactName: org.contact_name,
            contactEmail: org.contact_email,
            website: org.website,
            organizationNotes: org.organization_notes
          }
        });
      }
    } catch (e) {
      logError('db_error', 'organization_name', org.organization_name, e.message || String(e));
      continue;
    }

    for (const proj of org.projects) {
      let project;
      try {
        project = await prisma.projects.create({
          data: {
            projectName: proj.project_name,
            projectNotes: proj.project_notes
          }
        });
      } catch (e) {
        logError('db_error', 'project_name', proj.project_name, e.message || String(e));
        continue;
      }

      for (const landItem of proj.lands) {
        if (!landItem.geojson) {
          logError('missing_geojson', 'land_name', landItem.land_name, 'No geojson property');
          continue;
        }
        let land;
        try {
          land = await prisma.land.create({
            data: {
              land_name: landItem.land_name,
              hectares: landItem.hectares,
              landHolder: landItem.landHolder,
              gpsLat: landItem.gpsLat,
              gpsLon: landItem.gpsLon,
              land_notes: landItem.land_notes
            }
          });
        } catch (e) {
          logError('db_error', 'land_name', landItem.land_name, e.message || String(e));
          continue;
        }
        // Polygon creation example (simplified)
        try {
          const polygon = await prisma.polygons.create({
            data: {
              geojson: JSON.stringify(landItem.geojson),
              land_id: land.landId,
              landName: landItem.land_name
            }
          });
        } catch (e) {
          logError('db_error', 'polygon_id', landItem.land_name, e.message || String(e));
        }
        successCount++;
      }
    }
  }

  // Build nested error summary matching the structure of the input
  function getLandStatus(landName) {
    // Find land_name error for this land
    const landErr = Object.entries(errorMap).find(([key, val]) => key.endsWith(':land_name') && val.examples.some(e => e.value === landName));
    if (landErr) {
      let reason = landErr[1].examples.find(e => e.value === landName)?.error || 'Failed';
      if (typeof reason === 'string') {
        if (reason.includes('Unique constraint failed')) {
          reason = 'Unique constraint failed on land_name';
        } else if (reason.length > 100) {
          reason = reason.slice(0, 100) + '...';
        }
      }
      return { status: 'fail', reason };
    }
    return { status: 'ok', reason: null };
  }

  function getProjectStatus(projectName, lands) {
    // If any land failed, project is partial fail
    const anyFail = lands.some(l => l.status === 'fail');
    return { status: anyFail ? 'fail' : 'ok', reason: anyFail ? 'One or more lands failed' : null };
  }

  function getOrgStatus(orgName, projects) {
    const anyFail = projects.some(p => p.status === 'fail');
    return { status: anyFail ? 'fail' : 'ok', reason: anyFail ? 'One or more projects failed' : null };
  }

  const nestedSummary = geoJsonData.organizations.map(org => {
    const projects = org.projects.map(proj => {
      const lands = proj.lands.map(land => {
        const { status, reason } = getLandStatus(land.land_name);
        return {
          land_name: land.land_name,
          status,
          reason
        };
      });
      const { status, reason } = getProjectStatus(proj.project_name, lands);
      return {
        project_name: proj.project_name,
        status,
        reason,
        lands
      };
    });
    const { status, reason } = getOrgStatus(org.organization_name, projects);
    return {
      organization_name: org.organization_name,
      status,
      reason,
      projects
    };
  });

  const nestedFilePath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/lastGeoJsonErrors-nested.json');
  try {
    fs.writeFileSync(nestedFilePath, JSON.stringify(nestedSummary, null, 2), 'utf8');
    console.log(`Nested error summary written to ${nestedFilePath}`);
  } catch (e) {
    console.error('Failed to write nested error summary file:', e);
  }

  // ... (existing condensed summary code below remains unchanged)
  const condensedErrors = Object.entries(errorMap).map(([key, { count, examples }]) => {
    const [, attribute] = key.split(':');
    let shortReason = examples[0]?.error || 'Unknown error';
    if (typeof shortReason === 'string') {
      if (shortReason.includes('Unique constraint failed')) {
        shortReason = 'Unique constraint failed on ' + attribute;
      } else if (shortReason.includes('not defined')) {
        shortReason = shortReason.split('\n').pop() || shortReason;
      } else if (shortReason.length > 100) {
        shortReason = shortReason.slice(0, 100) + '...';
      }
    }
    return {
      attribute,
      failCount: count,
      reason: shortReason
    };
  });

  const condensedFilePath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/lastGeoJsonErrors-condensed.json');
  try {
    fs.writeFileSync(condensedFilePath, JSON.stringify(condensedErrors, null, 2), 'utf8');
    console.log(`Condensed error summary written to ${condensedFilePath}`);
  } catch (e) {
    console.error('Failed to write condensed error summary file:', e);
  }

  // Print summary to terminal
  if (condensedErrors.length === 0) {
    console.log(`GeoJSON import complete! Success count: ${successCount}. No errors.`);
  } else {
    console.log(`GeoJSON import complete! Success count: ${successCount}. Errors:`);
    for (const err of condensedErrors) {
      console.log(`- [${err.attribute}] (${err.failCount}): ${err.reason}`);
    }
  }
  await prisma.$disconnect();
}

// Allow running as: node importGeoJson.js [optional/path/to/file.geojson]
if (process.argv[1] && process.argv[1].endsWith('importGeoJson.js')) {
  (async () => {
    await importGeoJson(process.argv[2]);
  })();
}
