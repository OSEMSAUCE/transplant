// http://localhost:5173/api/submitToDB
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, land, crop, csvobj, metadata } from '$lib/server/db/schema';
import { prisma } from '$lib/server/prisma';

export async function POST({ request }) {
    console.log('API: Submit to DB request received');
    
    try {
        // Parse the incoming data
        const data = await request.json();
        console.log('Received data:', data);
        
        // First, store the original JSON data in the csvobj table
        const csvObjData = await db.insert(csvobj)
            .values({
                jsonData: data
            })
            .returning();
        
        const csvObjId = csvObjData[0].csvobjId;
        console.log('Created csvobj with ID:', csvObjId);
        
        // Process the data using Prisma for nested operations
        const result = await prisma.$transaction(async (prismaClient) => {
            // Create the project first
            const project = await prismaClient.projects.create({
                data: {
                    projectName: data.projectName || 'Unnamed Project',
                    projectNotes: data.projectNotes || '',
                    csvobjId: csvObjId
                }
            });
            
            console.log('Created project:', project);
            
            // Process land data with nested crops and plantings
            const landEntries = data.land || [];
            const landResults = [];
            
            for (const landItem of landEntries) {
                // Create land entry using the connect pattern for relationships
                const landEntry = await prismaClient.land.create({
                    data: {
                        landName: landItem.landName,
                        project: { connect: { projectId: project.projectId } },
                        hectares: landItem.hectares ? parseFloat(landItem.hectares) : null,
                        landHolder: landItem.landHolder || null,
                        gpsLat: landItem.gpsLat ? parseFloat(landItem.gpsLat) : null,
                        gpsLon: landItem.gpsLon ? parseFloat(landItem.gpsLon) : null,
                        landNotes: landItem.landNotes || null,
                        csvobj: { connect: { csvobjId: csvObjId } }
                    }
                });
                
                landResults.push(landEntry);
                
                // Store mapping information in metadata table
                for (const [key, value] of Object.entries(landItem)) {
                    if (key !== 'crops' && key !== 'plantings') {
                        await db.insert(metadata)
                            .values({
                                csvobjId: csvObjId,
                                csvKey: key,
                                dbKey: `land.${key}`
                            });
                    }
                }
            }
            
            // Process crop data
            const cropEntries = data.crops || [];
            const cropResults = [];
            
            for (const cropItem of cropEntries) {
                // Create crop entry with fields that match the actual database structure
                const cropEntry = await prismaClient.crop.create({
                    data: {
                        cropName: cropItem.cropName,
                        project: { connect: { projectId: project.projectId } },
                        // Use seedInfo field from the updated schema
                        seedInfo: cropItem.seedInfo || cropItem.seedlot || null,
                        cropStock: cropItem.cropStock || null,
                        cropNotes: cropItem.cropNotes || null,
                        csvobj: { connect: { csvobjId: csvObjId } }
                    }
                });
                
                cropResults.push(cropEntry);
                
                // Store mapping information in metadata table
                for (const [key, value] of Object.entries(cropItem)) {
                    await db.insert(metadata)
                        .values({
                            csvobjId: csvObjId,
                            csvKey: key,
                            dbKey: `crop.${key}`
                        });
                }
            }
            
            // Process planting data (connecting land and crops)
            const plantingEntries = data.plantings || [];
            const plantingResults = [];
            
            for (const plantingItem of plantingEntries) {
                // Find the corresponding land and crop entries
                const landEntry = landResults.find(l => l.landName === plantingItem.landName);
                const cropEntry = cropResults.find(c => c.cropName === plantingItem.cropName);
                
                if (landEntry && cropEntry) {
                    // Create planting entry using the correct Planting model
                    // Connect the land and crop using their IDs
                    const plantingEntry = await prismaClient.planting.create({
                        data: {
                            land: { connect: { landId: landEntry.landId } },
                            crop: { connect: { cropId: cropEntry.cropId } },
                            planted: plantingItem.planted ? parseInt(plantingItem.planted) : null,
                            plantingDate: plantingItem.plantingDate ? new Date(plantingItem.plantingDate) : null,
                            planting_notes: plantingItem.planting_notes || null,
                            csvobj: { connect: { csvobjId: csvObjId } }
                        }
                    });
                    
                    plantingResults.push(plantingEntry);
                    
                    // Store mapping information in metadata table
                    for (const [key, value] of Object.entries(plantingItem)) {
                        if (key !== 'landName' && key !== 'cropName') {
                            await db.insert(metadata)
                                .values({
                                    csvobjId: csvObjId,
                                    csvKey: key,
                                    dbKey: `planting.${key}`
                                });
                        }
                    }
                }
            }
            
            return {
                project,
                land: landResults,
                crops: cropResults,
                plantings: plantingResults
            };
        });
        
        return json({ 
            message: 'Data successfully submitted to database',
            csvObjId,
            result
        });
        
    } catch (error) {
        console.error('Error submitting data to DB:', error);
        // Log the full error for debugging
        if (error instanceof Error && error.stack) {
            console.error('Error stack:', error.stack);
        }
        return json({ 
            error: 'Failed to submit data to database',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}