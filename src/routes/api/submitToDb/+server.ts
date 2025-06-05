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
		const projects = await prisma.projectsTable.findMany({
			select: { projectName: true, projectId: true },
			where: { deleted: false }, // Only non-deleted projects
			orderBy: { projectName: 'asc' }
		});
    const organizations = await prisma.organizationsTable.findMany({
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
		const organization = await prisma.organizationsTable.upsert({
			where: { organizationName: data.organizationName },
			create: {
				organizationName: data.organizationName,
				organizationNotes: data.organizationNotes
			},
			update: {
				organizationNotes: data.organizationNotes
			}
		});
		
		// Create or find the project
		const project = await prisma.projectsTable.upsert({
			where: { projectName: data.projectName },
			create: {
				projectName: data.projectName,
				projectNotes: data.projectNotes,
				organizationId: organization.organizationId
			},
			update: {
				projectNotes: data.projectNotes,
				organizationId: organization.organizationId
			}
		});

		// Create land entries
		for (const landItem of data.land) {
			// Convert hectares to a string first to ensure it's serializable
			const hectaresValue = landItem.hectares
				? parseFloat(String(landItem.hectares).replace(',', '.'))
				: null;

			await prisma.landTable.upsert({
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
					// polygon: landItem.polygonId || null,
					landNotes: landItem.landNotes || null
				},
				update: {
					landName: landItem.landName,
					hectares: hectaresValue,
					// polygon: landItem.polygonId,
					gpsLat: landItem.gpsLat,
					gpsLon: landItem.gpsLon,
					landNotes: landItem.landNotes
				}
			});
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
					cropNotes: cropItem.cropNotes
				},
				update: {
					cropName: cropItem.cropName,
					speciesId: cropItem.speciesId,
					seedInfo: cropItem.seed_info,
					cropStock: cropItem.cropStock,
					cropNotes: cropItem.cropNotes
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

			if (land && crop) {
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
						plantingDate: plantingItem.plantingDate,
						planted: plantingItem.planted,
						plantingNotes: plantingItem.plantingNotes
					},
					update: {
						landId: land.landId,
						cropId: crop.cropId,
						plantingDate: plantingItem.plantingDate,
						planted: plantingItem.planted,
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
