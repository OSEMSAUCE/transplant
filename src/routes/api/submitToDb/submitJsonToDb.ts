import prisma from '$lib/server/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Processes GeoJSON data from the common format and submits it to the database
 * This function handles the organization -> projects -> lands structure with GeoJSON polygons
 */
export async function submitGeoJsonToDb(filePath?: string) {
    try {
        // If no file path is provided, use the default commonFormat.geojson
        const geoJsonPath = filePath || path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');
        
        // Read and parse the GeoJSON file
        const fileData = fs.readFileSync(geoJsonPath, 'utf8');
        const geoJsonData = JSON.parse(fileData);
        
        const results = [];
        
        // Process each organization
        for (const org of geoJsonData.organizations) {
            // Create or find the organization
            let organization = await prisma.organizations.findFirst({
                where: { organizationName: org.organization_name }
            });
            
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
            
            // Process each project in the organization
            for (const proj of org.projects) {
                // Create a new project
                const project = await prisma.projects.create({
                    data: {
                        projectName: proj.project_name,
                        projectNotes: proj.project_notes
                    }
                });
                
                // Process each land in the project
                for (const landItem of proj.lands) {
                    // Create a polygon entry for the GeoJSON data
                    const polygon = await prisma.polygons.create({
                        data: {
                            geojson: landItem.geojson,
                            polyNotes: landItem.land_notes
                        }
                    });
                    
                    // Create the land entry
                    const land = await prisma.land.create({
                        data: {
                            landName: landItem.land_name,
                            hectares: landItem.hectares ? parseFloat(String(landItem.hectares)) : null,
                            landHolder: landItem.landHolder,
                            polygonId: polygon.polygonId,
                            projectId: project.projectId,
                            gpsLat: landItem.gpsLat ? parseFloat(String(landItem.gpsLat)) : null,
                            gpsLon: landItem.gpsLon ? parseFloat(String(landItem.gpsLon)) : null,
                            landNotes: landItem.land_notes
                        }
                    });
                    
                    // Update the polygon with the land reference
                    await prisma.polygons.update({
                        where: { polygonId: polygon.polygonId },
                        data: { land_id: land.landId }
                    });
                }
                
                results.push({
                    projectId: project.projectId,
                    projectName: project.projectName
                });
            }
        }
        
        return {
            status: 'ok',
            message: 'GeoJSON data successfully imported',
            results
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
