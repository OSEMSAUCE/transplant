import prisma from '$lib/server/prisma';

// THIS IS WHERE THE QUERIES GO


export async function load() {
	// A more direct approach to handle Prisma objects
	function serializeForSvelteKit<T>(data: T): T {
		// Use JSON.stringify/parse to convert all objects to plain JavaScript objects
		// This will handle Decimal objects and BigInt values
		return JSON.parse(
			JSON.stringify(data, (key, value) => {
				// Special handling for Decimal objects
				if (
					value !== null &&
					typeof value === 'object' &&
					typeof value.toNumber === 'function' &&
					typeof value.toString === 'function'
				) {
					// This is likely a Decimal object
					return Number(value.toString());
				}
				// Handle BigInt values
				if (typeof value === 'bigint') {
					return Number(value);
				}
				return value;
			})
		);
	}

	// Define database table formats
	const landDbFormat = {
		landId: 'string',
		landName: 'string',
		projectId: 'string',
		hectares: 'number',
		landHolder: 'string',
		polygonId: 'string',
		gpsLat: 'number',
		gpsLon: 'number',
		landNotes: 'string',
		createdAt: 'date',
		lastEditedAt: 'date',
		editedBy: 'string',
		deleted: 'string',
		preparation: 'string',
		preparationId: 'number',
		csvobjId: 'string',
		polygon: 'string',
		project: 'string',
		csvobj: 'string',
		preparationType: 'string',
		plantings: 'string'
	};

	const cropDbFormat = {
		cropId: 'string',
		cropName: 'string',
		speciesId: 'string',
		seed_info: 'string',
		cropStock: 'string',
		createdAt: 'date',
		lastEditedAt: 'date',
		editedBy: 'string',
		deleted: 'string',
		projectId: 'string',
		organizationId: 'string',
		cropNotes: 'string',
		csvobjId: 'string',
		species: 'string',
		organization: 'string',
		project: 'string',
		csvobj: 'string',
		plantings: 'string'
	};

	const plantingDbFormat = {
		landName: 'string',
		cropName: 'string',
		// cropId: "string",
		planted: 'number',
		plantingDate: 'date',
		createdAt: 'date',
		lastEditedAt: 'date',
		deleted: 'string',
		planting_notes: 'string'
	};

	// Fetch data from Prisma
	const rawLandsDbTable = await prisma.landTable.findMany({ take: 3 });
	const rawPlantingDbTable = await prisma.plantingTable.findMany({ take: 3 });
	const rawCropDbTable = await prisma.cropTable.findMany({ take: 3 });

	// Serialize and filter the data to only include selected attributes
	const landsDbTable = serializeForSvelteKit(rawLandsDbTable);
	const plantingDbTable = serializeForSvelteKit(rawPlantingDbTable);
	const cropDbTable = serializeForSvelteKit(rawCropDbTable);

	console.log('dbFormat', landDbFormat);

	return {
		landsDbTable,
		plantingDbTable,
		cropDbTable,
		landDbFormat,
		plantingDbFormat,
		cropDbFormat
	};
}

// Example: src/lib/db/columnFormats.ts

const landDbFormat = {
	landName: 'string',
	hectares: 'number',
	landHolder: 'string',
	gpsLat: 'number',
	gpsLon: 'number',
	landNotes: 'string'
	// ...etc
};

const cropDbFormat = {
	cropName: 'string',
	speciesId: 'string',
	seed_info: 'string',
	cropStock: 'string',
	createdAt: 'date',
	lastEditedAt: 'date',
	editedBy: 'string',
	deleted: 'boolean',
	projectId: 'string',
	organizationId: 'string',
	cropNotes: 'string',
	csvobjId: 'string'
};

const plantingDbFormat = {
	plantingDate: 'date'
	// ...etc
};