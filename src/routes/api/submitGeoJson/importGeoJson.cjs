// importGeoJson.js - Entity-level GeoJSON import script
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

// Define paths
const geoJsonPath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');
const statusFilePath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/lastSubmitStatus.json');

/**
 * Get a more descriptive error message from Prisma errors
 */
function getPrismaErrorDetails(error) {
  // Check if it's a Prisma error with a code
  if (error.code) {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        return `Duplicate entry: ${error.meta?.target?.join(', ') || 'unknown field'}`;
      case 'P2003': // Foreign key constraint failed
        return `Foreign key constraint failed: ${error.meta?.field_name || 'unknown field'}`;
      case 'P2025': // Record not found
        return 'Related record not found';
      default:
        return error.message;
    }
  }
  return error.message;
}

/**
 * Import GeoJSON data into the database
 */
async function importGeoJson() {
  // Entity-level summary object
  const entitySummary = {};
  
  try {
    // Read and parse GeoJSON file
    if (!fs.existsSync(geoJsonPath)) {
      throw new Error(`GeoJSON file not found: ${geoJsonPath}`);
    }
    
    const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
    
    // Process organizations
    if (geoJsonData.organizations && Array.isArray(geoJsonData.organizations)) {
      let orgCount = 0, orgFail = 0, orgDuplicate = 0;
      let orgReason = '';
      
      for (const org of geoJsonData.organizations) {
        orgCount++;
        let orgOk = true;
        
        try {
          // Check if organization exists
          let organization = await prisma.organizations.findFirst({ 
            where: { organizationName: org.organization_name } 
          });
          
          // Create organization if it doesn't exist
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
          } else {
            // Organization already exists - count as duplicate but don't fail
            orgDuplicate++;
          }
        } catch (e) {
          orgFail++;
          orgReason = getPrismaErrorDetails(e);
          orgOk = false;
        }
        
        // Process projects
        if (org.projects && Array.isArray(org.projects)) {
          let projectCount = 0, projectFail = 0, projectDuplicate = 0;
          let projectReason = '';
          
          for (const proj of org.projects) {
            projectCount++;
            let projectOk = orgOk;
            let projectObj = null;
            
            if (orgOk) {
              try {
                // Check if project exists first
                projectObj = await prisma.projects.findFirst({
                  where: { projectName: proj.project_name }
                });
                
                if (!projectObj) {
                  projectObj = await prisma.projects.create({
                    data: {
                      projectName: proj.project_name,
                      projectNotes: proj.project_notes
                    }
                  });
                } else {
                  // Project already exists - count as duplicate but don't fail
                  projectDuplicate++;
                }
              } catch (e) {
                projectFail++;
                projectReason = getPrismaErrorDetails(e);
                projectOk = false;
              }
            } else {
              projectFail++;
              projectReason = 'Not attempted because organization creation failed';
              projectOk = false;
            }
            
            // Process lands
            if (proj.lands && Array.isArray(proj.lands)) {
              let landCount = 0, landFail = 0, landDuplicate = 0, polygonCount = 0;
              let landReason = '';
              
              for (const landItem of proj.lands) {
                landCount++;
                let landOk = projectOk;
                let landObj = null;
                
                if (projectOk) {
                  try {
                    // Check if land exists first
                    landObj = await prisma.land.findFirst({
                      where: { landName: landItem.land_name }
                    });
                    
                    if (!landObj) {
                      landObj = await prisma.land.create({
                        data: {
                          land_name: landItem.land_name,
                          hectares: landItem.hectares,
                          landHolder: landItem.landHolder,
                          gpsLat: landItem.gpsLat,
                          gpsLon: landItem.gpsLon,
                          land_notes: landItem.land_notes
                        }
                      });
                    } else {
                      // Land already exists - count as duplicate but don't fail
                      landDuplicate++;
                    }
                  } catch (e) {
                    landFail++;
                    landReason = getPrismaErrorDetails(e);
                    landOk = false;
                  }
                } else {
                  landFail++;
                  landReason = 'Not attempted because project creation failed';
                  landOk = false;
                }
                
                // Process polygon
                polygonCount++;
                if (landOk && landItem.geojson) {
                  try {
                    // Use the land object we either found or created
                    if (landObj) {
                      // Check if polygon already exists
                      const existingPolygon = await prisma.polygons.findFirst({
                        where: { land_id: landObj.landId }
                      });
                      
                      if (!existingPolygon) {
                        await prisma.polygons.create({
                          data: {
                            geojson: JSON.stringify(landItem.geojson),
                            land_id: landObj.landId,
                            landName: landItem.land_name
                          }
                        });
                      }
                    }
                  } catch (e) {
                    // For this entity-level summary, we don't track polygon failures separately
                  }
                }
              }
              
              // Add land summary if there were failures or duplicates
              if (landFail > 0 || landDuplicate > 0) {
                entitySummary['land'] = { 
                  failCount: landFail,
                  duplicateCount: landDuplicate,
                  reason: landReason || (landDuplicate > 0 ? 'Some land entries already exist in the database' : '')
                };
                
                // If all lands failed, add polygon skipped info
                if (landFail === landCount) {
                  entitySummary['polygon'] = { 
                    skippedCount: polygonCount, 
                    reason: 'Not attempted because land creation failed' 
                  };
                }
              }
            }
          }
          
          // Add project summary if there were failures or duplicates
          if (projectFail > 0 || projectDuplicate > 0) {
            entitySummary['project'] = { 
              failCount: projectFail,
              duplicateCount: projectDuplicate,
              reason: projectReason || (projectDuplicate > 0 ? 'Some project entries already exist in the database' : '')
            };
          }
        }
      }
      
      // Add organization summary if there were failures or duplicates
      if (orgFail > 0 || orgDuplicate > 0) {
        entitySummary['organization'] = { 
          failCount: orgFail,
          duplicateCount: orgDuplicate,
          reason: orgReason || (orgDuplicate > 0 ? 'Some organization entries already exist in the database' : '')
        };
      }
    } else {
      throw new Error('Invalid GeoJSON format: missing organizations array');
    }
    
    // Write summary to file
    if (Object.keys(entitySummary).length > 0) {
      fs.writeFileSync(statusFilePath, JSON.stringify(entitySummary, null, 2), 'utf8');
      console.log('Entity-level summary written to', statusFilePath);
    } else {
      fs.writeFileSync(statusFilePath, JSON.stringify({ 
        status: 'success', 
        message: 'All records submitted successfully.' 
      }, null, 2), 'utf8');
      console.log('Success summary written to', statusFilePath);
    }
    
  } catch (error) {
    console.error('Error importing GeoJSON:', error.message);
    
    // Write error summary even if the process failed early
    fs.writeFileSync(statusFilePath, JSON.stringify({
      error: {
        message: error.message
      }
    }, null, 2), 'utf8');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import function
importGeoJson().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
