import { prisma } from '$lib/server/prisma';

const fakeData = [
	{
		column1: 'string',
		col2: 2,
		col3: 3
	}
];

const fakeFormats = {
	column1: 'string',
	col2: 'number',
	col3: 'number'
};

// THIS IS WHERE THE QUERIES GO
// async function main() {
//     const Land = await prisma.land.findMany()
//     const insertLand = await prisma.land.create({
//         data: {
//             landName: 'elsa@prisma.io',
//             // projectId: null,
//             hectares: 123,
//             landHolder: "string" ,
//             // polygonId: 'elsa@prisma.io',
//             gpsLat: 123,
//             gpsLon: 123,
//             landNotes: "string",
//         },
//     })
//     console.log(insertLand)
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect()
//   })
//   .catch(async (e) => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })

export async function load() {
	// A more direct approach to handle Prisma objects
	function serializeForSvelteKit<T>(data: T): T {
		// Use JSON.stringify/parse to convert all objects to plain JavaScript objects
		// This will handle Decimal objects by calling their toString() method
		return JSON.parse(JSON.stringify(data, (key, value) => {
			// Special handling for Decimal objects
			if (value !== null && 
				typeof value === 'object' && 
				typeof value.toNumber === 'function' && 
				typeof value.toString === 'function') {
				// This is likely a Decimal object
				return Number(value.toString());
			}
			return value;
		}));
	}

	// Define database table formats
	const landDbFormat = {
		landId: "string",
		landName: "string",
		projectId: "string",
		hectares: "number",
		landHolder: "string",
		polygonId: "string",
		gpsLat: "number",
		gpsLon: "number",
		landNotes: "string",
		createdAt: "date",
		lastEditedAt: "date",
		editedBy: "string",
		deleted: "string",
		preparation: "string",
		preparationId: "number",
		csvobjId: "string",
		polygon: "string",
		project: "string",
		csvobj: "string",
		preparationType: "string",
		plantings: "string",
	};
			
	const cropDbFormat = {
		cropId: "string",
		cropName: "string",
		speciesId: "string",
		seed_info: "string",
		cropStock: "string",
		createdAt: "date",
		lastEditedAt: "date",
		editedBy: "string",
		deleted: "string",
		projectId: "string",
		organizationId: "string",
		cropNotes: "string",
		csvobjId: "string",
		species: "string",
		organization: "string",
		project: "string",
		csvobj: "string",
		plantings: "string",
	};

	const plantingDbFormat = {
		landName: "string",
		cropName: "string",
		// cropId: "string",
		planted: "number",
		plantingDate: "date",
		createdAt: "date",
		lastEditedAt: "date",
		deleted: "string",
		planting_notes: "string",
	};

	// Fetch data from Prisma
	const rawLandsDbTable = await prisma.land.findMany({ take: 3 });
	const rawPlantingDbTable = await prisma.planting.findMany({ take: 3 });
	const rawCropDbTable = await prisma.crop.findMany({ take: 3 });
	
	// Serialize and filter the data to only include selected attributes
	const landsDbTable = serializeForSvelteKit(rawLandsDbTable)
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


// // 🌲️🌲️🌲️🌲️🌲️🌲️🌲️🌲️ Selector Types for db table 🌲️🌲️🌲️🌲️
function dbFormatSelector(table: any) {
	console.log(table.landName);
	let columnFormats: Record<string, string> = {};
	for (const [columnName, column] of Object.entries(table)) {
		if (column && typeof column === 'object' && 'typeName' in column) {
			const columnDescription = column as any;
			let format = 'string';
			if (columnDescription.typeName === 'number') {
				format = 'number';
			} else if (columnDescription.typeName === 'Decimal') {
				format = 'number';
			} else if (columnDescription.typeName === 'Uuid') {
				format = 'string';
			} else if (columnDescription.typeName === 'DateTime') {
				format = 'date';
			} else if (columnDescription.typeName === 'String') {
				format = 'string';
			} else if (columnDescription.typeName === 'Boolean') {
				format = 'string';
			}
			columnFormats[columnName] = format;
		}
	}
	return columnFormats;
}
