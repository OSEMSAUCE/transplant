import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export async function POST({ request }) {
	const data = await request.json();
	try {
		// Create a new project
		const project = await prisma.projects.create({
			data: {
				projectName: data.projectName,
				projectNotes: data.projectNotes
			}
		});

		// Create land entries
		for (const landItem of data.land) {
			await prisma.land.create({
				data: {
					landName: landItem.landName,
					hectares: landItem.hectares ? 
						typeof landItem.hectares === 'string' ? 
							parseFloat(landItem.hectares.replace(',', '.')) : 
						landItem.hectares : 
					null,
					projectId: project.projectId
				}
			});
		}

		// Create crop entries
		for (const cropItem of data.crops) {
			await prisma.crop.create({
				data: {
					cropName: cropItem.cropName,
					projectId: project.projectId
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

		return new Response(JSON.stringify({ 
			status: 'ok', 
			message: 'Data successfully saved to database',
			projectId: project.projectId
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error saving data to database:', error);
		return new Response(JSON.stringify({ 
			status: 'error', 
			message: 'Failed to save data to database', 
			error: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}