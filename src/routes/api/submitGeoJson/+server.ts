import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Processes GeoJSON data from the common format and submits it to the database
 * This function handles the organization -> projects -> lands structure with GeoJSON polygons
 */
async function submitGeoJsonToDb(filePath?: string, verbose = true) {
    try {
        // If no file path is provided, use the default commonFormat.geojson
        const geoJsonPath = filePath || path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');
        
        // Read and parse the GeoJSON file
        const fileData = fs.readFileSync(geoJsonPath, 'utf8');
        const geoJsonData = JSON.parse(fileData);
        
        const results = [];
        const issues = [];
        const polygonsCreated = [];
        const landsCreated = [];
        const errorMap: Record<string, { count: number; examples: any[] }> = {};
        let successCount = 0;

        // Process each organization
        for (const org of geoJsonData.organizations) {
            // Create or find the organization
            let organization = await prisma.organizationsTable.findFirst({
                where: { organizationName: org.organization_name }
            });
            
            if (!organization) {
                organization = await prisma.organizationsTable.create({
                    data: {
                        organizationName: org.organization_name,
                        contactName: org.contact_name,
                        contactEmail: org.contact_email,
                        website: org.website,
                        organizationNotes: org.organization_notes
                    }
                });
            }
            
            // Process each project in the organization
            for (const proj of org.projects) {
                // Create a new project
                const project = await prisma.projectsTable.create({
                    data: {
                        projectName: proj.project_name,
                        projectNotes: proj.project_notes
                    }
                });
                
                // Process each land in the project
                for (const landItem of proj.lands) {
                    // Validate GeoJSON data
                    if (!landItem.geojson) {
                        issues.push({
                            type: 'missing_geojson',
                            landName: landItem.land_name,
                            projectName: proj.project_name
                        });
                    }
                    
                    // Create a polygon entry for the GeoJSON data
                    try {
                        const polygon = await prisma.polygonsTable.create({
                            data: {
                                geojson: landItem.geojson,  
                                polyNotes: landItem.land_notes
                            }
                        });
                        
                        polygonsCreated.push({
                            polygonId: polygon.polygonId,
                            landName: landItem.land_name,
                            hasGeojson: !!landItem.geojson
                        });
                    
                        // Create the land entry
                        try {
                            const land = await prisma.landTable.create({
                                data: {
                                    landName: landItem.land_name,
                                    hectares: landItem.hectares ? parseFloat(String(landItem.hectares)) : null,
                                    polygonId: polygon.polygonId,
                                    projectId: project.projectId,
                                    gpsLat: landItem.gpsLat ? parseFloat(String(landItem.gpsLat)) : null,
                                    gpsLon: landItem.gpsLon ? parseFloat(String(landItem.gpsLon)) : null,
                                    landNotes: landItem.land_notes
                                }
                            });
                            
                            landsCreated.push({
                                landId: land.landId,
                                landName: land.landName,
                                polygonId: polygon.polygonId
                            });
                            
                            successCount++;
                        } catch (e: any) {
                            logError(errorMap, 'db_error', 'land_name', landItem.land_name, e.message || String(e));
                        }
                    
                        // Update the polygon with the land reference
                        try {
                            await prisma.polygonsTable.update({
                                where: { polygonId: polygon.polygonId },
                                data: { land_id: land.landId }
                            });
                        } catch (e: any) {
                            logError(errorMap, 'db_error', 'polygon_id', polygon.polygonId, e.message || String(e));
                        }
                    } catch (error) {
                        logError(errorMap, 'polygon_creation_failed', 'land_name', landItem.land_name, error instanceof Error ? error.message : String(error));
                    }
                }
                
                results.push({
                    projectId: project.projectId,
                    projectName: project.projectName
                });
            }
        }
        
        // Verify polygon-land relationships
        const verificationResults = [];
        for (const polygon of polygonsCreated) {
            try {
                const verifiedPolygon = await prisma.polygonsTable.findUnique({
                    where: { polygonId: polygon.polygonId }
                });
                
                verificationResults.push({
                    polygonId: polygon.polygonId,
                    hasLandReference: !!verifiedPolygon?.land_id,
                    landName: polygon.landName
                });
            } catch (error) {
                logError(errorMap, 'verification_failed', 'polygon_id', polygon.polygonId, error instanceof Error ? error.message : String(error));
            }
        }
        
        if (verbose) {
            console.log('GeoJSON Import Summary:');
            console.log(`- Projects created: ${results.length}`);
            console.log(`- Lands created: ${landsCreated.length}`);
            console.log(`- Polygons created: ${polygonsCreated.length}`);
            console.log(`- Issues encountered: ${issues.length}`);
            
            if (issues.length > 0) {
                console.log('Issues:');
                issues.forEach((issue, i) => console.log(`  ${i+1}. ${JSON.stringify(issue)}`));
            }
        }
        
        // Build error summary for response
        const errorSummary = Object.entries(errorMap).map(([key, { count, examples }]) => {
            const [type, attribute] = key.split(':');
            return { type, attribute, count, examples };
        });

        // Write only the condensed error summary for quick review
        const condensedErrors: Array<{ attribute: string, value: any, reason: string }> = [];
        for (const err of errorSummary) {
            for (const ex of err.examples) {
                let shortReason = ex.error;
                if (typeof shortReason === 'string') {
                    if (shortReason.includes('Unique constraint failed')) {
                        shortReason = 'Unique constraint failed on ' + err.attribute;
                    } else if (shortReason.includes('not defined')) {
                        shortReason = shortReason.split('\n').pop() || shortReason;
                    } else if (shortReason.length > 100) {
                        shortReason = shortReason.slice(0, 100) + '...';
                    }
                }
                condensedErrors.push({
                    attribute: err.attribute,
                    value: ex.value,
                    reason: shortReason
                });
            }
        }
        const condensedFilePath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/lastGeoJsonErrors-condensed.json');
        try {
            fs.writeFileSync(condensedFilePath, JSON.stringify(condensedErrors, null, 2), 'utf8');
        } catch (fileErr) {
            console.error('Failed to write condensed error summary file:', fileErr);
        }
        
        return {
            status: issues.length > 0 || Object.keys(errorMap).length > 0 ? 'partial' : 'ok',
            message: issues.length > 0 || Object.keys(errorMap).length > 0 
                ? `GeoJSON data imported with ${issues.length + Object.keys(errorMap).length} issues` 
                : 'GeoJSON data successfully imported',
            results,
            details: {
                polygonsCreated,
                landsCreated,
                verificationResults,
                issues,
                errorSummary,
                successCount
            }
        };
    } catch (error) {
        console.error('Error importing GeoJSON data:', error);
        return {
            status: 'error',
            message: 'Failed to import GeoJSON data',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// Helper function to safely serialize Prisma data
const safeSerialize = (data: any) => {
    return JSON.stringify(data, (key, value) => {
        // Convert Decimal objects to strings to make them serializable
        if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
            // Check if it's likely a Decimal
            if ('s' in value && 'd' in value && value.constructor.name === 'Decimal') {
                return value.toString();
            }
        }
        return value;
    });
};

// Helper for smart error aggregation
const MAX_ERROR_EXAMPLES = 10;
function logError(errorMap: Record<string, { count: number; examples: any[] }>, type: string, attribute: string, value: any, error: string) {
  const key = `${type}:${attribute}`;
  if (!errorMap[key]) errorMap[key] = { count: 0, examples: [] };
  errorMap[key].count++;
  if (errorMap[key].examples.length < MAX_ERROR_EXAMPLES) {
    errorMap[key].examples.push({ value, error });
  }
}

export async function POST({ request }) {
    try {
        const data = await request.json();
        const filePath = data.filePath; // Optional custom file path
        const verbose = data.verbose !== false; // Default to true
        
        const result = await submitGeoJsonToDb(filePath, verbose);
        
        return new Response(safeSerialize(result), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error processing GeoJSON submission:', error);
        return new Response(
            safeSerialize({
                status: 'error',
                message: 'Failed to process GeoJSON submission',
                error: error instanceof Error ? error.message : String(error)
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
