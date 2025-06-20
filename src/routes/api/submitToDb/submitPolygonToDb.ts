import prisma from '$lib/server/prisma';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';

/**
 * Processes GeoJSON data from the common format and submits it to the database
 * This function handles the organization -> projects -> lands structure with GeoJSON polygons
 */
export async function submitGeoJsonToDb(filePath?: string) {
	try {
		// If no file path is provided, use the default commonFormat.geojson
		const geoJsonPath =
			filePath || path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');

		// Read and parse the GeoJSON file
		const fileData = fs.readFileSync(geoJsonPath, 'utf8');
		const geoJsonData = JSON.parse(fileData);

		const results = [];

		// Process each organizationa
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
					// First create the land entry without the polygon reference
					const land = await prisma.landTable.create({
						data: {
							landName: landItem.land_name,
							hectares: landItem.hectares ? new Prisma.Decimal(String(landItem.hectares)) : null,
							projectId: project.projectId,
							gpsLat: landItem.gpsLat ? new Prisma.Decimal(String(landItem.gpsLat)) : null,
							gpsLon: landItem.gpsLon ? new Prisma.Decimal(String(landItem.gpsLon)) : null,
							landNotes: landItem.land_notes
						}
					});

					// Create a polygon entry for the GeoJSON data with the land reference
					// Using raw SQL since Prisma doesn't directly support PostGIS polygon type
					const polygonResult = await prisma.$queryRaw<{ polygonId: bigint }[]>`
                        INSERT INTO "public"."polygonTable" ("polygon", "polygonNotes", "landId")
                        VALUES (
                            ST_GeomFromGeoJSON(${JSON.stringify(landItem.geojson)}),
                            ${landItem.land_notes || null},
                            ${land.landId}
                        )
                        RETURNING "polygonId"
                    `;

					const polygonId = polygonResult[0]?.polygonId;

					// Update the land entry with the polygon reference
					if (polygonId) {
						await prisma.landTable.update({
							where: { landId: land.landId },
							data: { polygonId }
						});
					}
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
