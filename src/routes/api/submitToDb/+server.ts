import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

//
// this is going to post projectName and projectStatus along with
// the rest of the posts on this page. Upsert, like the rest of it.
// export async function POST() {
// 	// add new projects
// 	}

// select projectName and looking ProjectStakeholders,

export async function GET() {
	try {
		// Query only projectName from Projects
		const projects = await prisma.projectTable.findMany({
			select: { projectName: true, projectId: true },
			where: { deleted: false }, // Only non-deleted projects
			orderBy: { projectName: 'asc' }
		});
		const organizations = await prisma.organizationTable.findMany({
			select: { organizationName: true, organizationId: true },
			where: { deleted: false }, // Only non-deleted projects
			orderBy: { organizationName: 'asc' }
		});
		// Map to array of strings

		return json({ projects, organizations });
	} catch (error) {
		console.error('Failed to fetch project names:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch project names' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// export async function POST({request}) {
// 	const data = await request.json();
// 	return json({ message: 'Project added successfully' });
// }

export async function POST({ request }) {
	const data = await request.json();

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

	try {
		// Create or find the organization
		let organizationId = null;

		if (data.organizationName) {
			const organization = await prisma.organizationTable.upsert({
				where: { organizationName: data.organizationName },
				create: {
					organizationName: data.organizationName,
					organizationNotes: data.organizationNotes || ''
				},
				update: {
					organizationNotes: data.organizationNotes || ''
				}
			});
			organizationId = organization.organizationId;
		}

		// Create or find the project
		const project = await prisma.projectTable.upsert({
			where: { projectName: data.projectName },
			create: {
				projectName: data.projectName,
				projectNotes: data.projectNotes || '',
				...(organizationId ? { organizationId } : {})
			},
			update: {
				projectNotes: data.projectNotes || '',
				...(organizationId ? { organizationId } : {})
			}
		});

		// Create land entries
		const landMap = new Map(); // To store landName -> landId mapping

		for (const landItem of data.land) {
			// Convert hectares to a string first to ensure it's serializable
			const hectaresValue = landItem.hectares
				? parseFloat(String(landItem.hectares).replace(',', '.'))
				: null;

			const land = await prisma.landTable.upsert({
				where: {
					projectId_landName: {
						projectId: project.projectId,
						landName: landItem.landName
					}
				},
				create: {
					landName: landItem.landName,
					hectares: hectaresValue || null,
					gpsLat: landItem.gpsLat || null,
					gpsLon: landItem.gpsLon || null,
					projectId: project.projectId,
					landNotes: landItem.landNotes || null
				},
				update: {
					landName: landItem.landName,
					hectares: hectaresValue,
					gpsLat: landItem.gpsLat,
					gpsLon: landItem.gpsLon,
					landNotes: landItem.landNotes
				}
			});

			// Store the land ID for later polygon processing
			landMap.set(landItem.landName, land.landId);
		}

		// Process polygon data if available
		if (data.polygons && data.polygons.length > 0) {
			console.log(`Processing ${data.polygons.length} polygons`);
			for (const polygonItem of data.polygons) {
				const landId = landMap.get(polygonItem.landName);
				if (landId && polygonItem.polygon) {
					console.log(
						`Processing polygon for land ${polygonItem.landName}: ${polygonItem.polygon.substring(0, 100)}${polygonItem.polygon.length > 100 ? '...' : ''}`
					);

					try {
						// Parse the polygon string to extract coordinate pairs
						// Try standard WKT format first: POLYGON((x1 y1, x2 y2, ...))
						let wktRegex = /POLYGON\s*\(\(([^)]+)\)\)/;
						let match = polygonItem.polygon.match(wktRegex);

						// If standard WKT format doesn't match, try alternative format: ((x1 y1, x2 y2, ...))
						if (!match || !match[1]) {
							wktRegex = /\(\(([^)]+)\)\)/;
							match = polygonItem.polygon.match(wktRegex);
						}

						if (!match || !match[1]) {
							console.error(`Error parsing polygon data: Error: Failed to parse polygon format`);
							throw new Error('Failed to parse polygon format');
						}

						// Extract coordinate pairs and format them for PostgreSQL polygon type
						const coordinates = match[1]
							.split(',')
							.map((coord: string) => {
								const [x, y] = coord.trim().split(' ');
								return `(${x},${y})`;
							})
							.join(',');

						// Format as PostgreSQL polygon string: ((x1,y1),(x2,y2),...)
						const polygonPoints = `(${coordinates})`;

						// Variable to store polygon ID outside the try-catch block for later use
						let polygonId: bigint | undefined;

						try {
							// Log the converted polygon format for debugging
							console.log(
								`Converted polygon format: ${polygonPoints.substring(0, 100)}${polygonPoints.length > 100 ? '...' : ''}`
							);

							// First check if a polygon already exists for this land
							const existingPolygon = await prisma.$queryRaw<{ polygonId: bigint }[]>`
								SELECT "polygonId" FROM "public"."polygonTable" 
								WHERE "landId" = ${landId}::uuid
							`;

							if (existingPolygon.length > 0) {
								// Update existing polygon
								polygonId = existingPolygon[0].polygonId;
								await prisma.$queryRaw`
									UPDATE "public"."polygonTable" 
									SET "polygon" = ${polygonPoints}::polygon 
									WHERE "polygonId" = ${polygonId}
								`;
								console.log(
									`Successfully updated polygon with ID ${polygonId} for land ${polygonItem.landName}`
								);
							} else {
								// Insert new polygon
								const polygonResult = await prisma.$queryRaw<{ polygonId: bigint }[]>`
									INSERT INTO "public"."polygonTable" ("polygon", "landId")
									VALUES (
										${polygonPoints}::polygon,
										${landId}::uuid
									)
									RETURNING "polygonId"
								`;

								polygonId = polygonResult[0]?.polygonId;
								console.log(
									`Successfully created polygon with ID ${polygonId} for land ${polygonItem.landName}`
								);
							}

							// Update the land entry with the polygon reference
							if (polygonId) {
								await prisma.landTable.update({
									where: { landId },
									data: { polygonId }
								});
								console.log(`Successfully linked polygon to land ${polygonItem.landName}`);
							}
						} catch (error) {
							// Type assertion for error object to access properties safely
							const insertError = error as Error;
							console.error(
								`Error processing polygon for land ${polygonItem.landName}: ${insertError}`
							);
							console.error(`Error details: ${insertError.message || 'Unknown error'}`);
							console.error(`Stack trace: ${insertError.stack || 'No stack trace available'}`);
						}
					} catch (error) {
						const err = error as Error;
						console.error(`Error creating polygon for land ${polygonItem.landName}:`, err);
						console.error(`Error details: ${err.message || 'Unknown error'}`);
						console.error(`Stack trace: ${err.stack || 'No stack trace available'}`);
					}
				} else {
					console.warn(
						`Could not find land ID for polygon with land name: ${polygonItem.landName}`
					);
				}
			}
		}

		// Create crop entries
		for (const cropItem of data.crops) {
			await prisma.cropTable.upsert({
				where: {
					projectId_cropName: {
						cropName: cropItem.cropName,
						projectId: project.projectId
					}
				},
				create: {
					cropName: cropItem.cropName,
					speciesId: cropItem.speciesId,
					seedInfo: cropItem.seed_info,
					cropStock: cropItem.cropStock,
					cropNotes: cropItem.cropNotes,
					projectId: project.projectId
				},
				update: {
					cropName: cropItem.cropName,
					speciesId: cropItem.speciesId,
					seedInfo: cropItem.seed_info,
					cropStock: cropItem.cropStock,
					cropNotes: cropItem.cropNotes,
					projectId: project.projectId
				}
			});
		}

		// Create planting entries
		for (const plantingItem of data.plantings) {
			// First, find the land and crop IDs

			const land = await prisma.landTable.findFirst({
				where: {
					landName: plantingItem.landName,
					projectId: project.projectId
				}
			});

			const crop = await prisma.cropTable.findFirst({
				where: {
					cropName: plantingItem.cropName,
					projectId: project.projectId
				}
			});
			console.log('TEST land', land);
			console.log('TEST crop', crop);
			if (land && crop) {
				console.log('land', land);
				console.log('crop', crop);
				await prisma.plantingTable.upsert({
					where: {
						landId_cropId: {
							landId: land.landId,
							cropId: crop.cropId
						},
						plantingDate: plantingItem.plantingDate
					},
					create: {
						landId: land.landId,
						cropId: crop.cropId,
						projectId: project.projectId,
						plantingDate: plantingItem.plantingDate,
						planted: plantingItem.planted
							? parseInt(String(plantingItem.planted).replace(/,/g, ''), 10)
							: null,
						plantingNotes: plantingItem.plantingNotes
					},
					update: {
						landId: land.landId,
						cropId: crop.cropId,
						plantingDate: plantingItem.plantingDate,
						planted: plantingItem.planted
							? parseInt(String(plantingItem.planted).replace(/,/g, ''), 10)
							: null,
						plantingNotes: plantingItem.plantingNotes
					}
				});
			}
		}

		return new Response(
			safeSerialize({
				status: 'ok',
				message: 'Data successfully saved to database',
				projectId: project.projectId
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Error saving data to database:', error);
		return new Response(
			safeSerialize({
				status: 'error',
				message: 'Failed to save data to database',
				error: error instanceof Error ? error.message : String(error)
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}
