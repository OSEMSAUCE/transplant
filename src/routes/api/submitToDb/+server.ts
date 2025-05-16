// import { Planting } from './../../../../node_modules/.prisma/client/index.d';
import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

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
		// Create a new project
		const project = await prisma.projects.upsert({
			where: { projectName: data.projectName },
			create: {
				projectName: data.projectName,
				projectNotes: data.projectNotes
			},
			update: {
				projectNotes: data.projectNotes
			}
		});

		// Create land entries
		for (const landItem of data.land) {
			// Convert hectares to a string first to ensure it's serializable
			const hectaresValue = landItem.hectares
				? parseFloat(String(landItem.hectares).replace(',', '.'))
				: null;

			await prisma.land.upsert({
				where: { landName: landItem.landName, projectId: project.projectId },
				create: {
					landName: landItem.landName,
					hectares: hectaresValue || null,
					landHolder: landItem.landHolder || null,
					gpsLat: landItem.gpsLat || null,
					gpsLon: landItem.gpsLon || null,
					// polygon: landItem.polygonId || null,
					landNotes: landItem.landNotes || null
				},
				update: {
					landName: landItem.landName,
					hectares: hectaresValue,
					landHolder: landItem.landHolder,
					// polygon: landItem.polygonId,
					gpsLat: landItem.gpsLat,
					gpsLon: landItem.gpsLon,
					landNotes: landItem.landNotes
				}
			});
		}

		// Create crop entries
		for (const cropItem of data.crops) {
			await prisma.crop.upsert({
				where: { cropName: cropItem.cropName, projectId: project.projectId },
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
			const land = await prisma.land.findFirst({
				where: {
					landName: plantingItem.landName,
					projectId: project.projectId
				}
			});

			const crop = await prisma.crop.findFirst({
				where: {
					cropName: plantingItem.cropName,
					projectId: project.projectId
				}
			});

			if (land && crop) {
				await prisma.planting.create({
					data: {
						landId: land.landId,
						cropId: crop.cropId
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
