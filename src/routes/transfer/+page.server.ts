import prisma from '$lib/server/prisma';

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
//             landName: 'Test Land',
//             projectId: '123e4567-e89b-12d3-a456-426614174000',
//             hectares: 10.5,
//         },
//     })
//     console.log({ Land, insertLand })
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

export const load = async () => {
	// Define the table formats
	const landDbFormat = {
		landId: 'string',
		landName: 'string',
		projectId: 'string',
		hectares: 'number',
		gpsLat: 'number',
		gpsLon: 'number',
		landNotes: 'string',
		createdAt: 'date',
		lastEditedAt: 'date',
		editedBy: 'string',
		deleted: 'string',
		preparation: 'string',
		csvobjId: 'string',
		polygon: 'string'
	};

	const plantingDbFormat = {
		plantingId: 'string',
		landId: 'string',
		planted: 'number',
		plantingDate: 'date',
		createdAt: 'date',
		lastEditedAt: 'date',
		deleted: 'string',
		cropId: 'string',
		plantingNotes: 'string'
	};

	const cropDbFormat = {
		cropId: 'string',
		cropName: 'string',
		speciesId: 'string',
		seedInfo: 'string',
		cropStock: 'string',
		createdAt: 'date',
		lastEditedAt: 'date',
		editedBy: 'string',
		deleted: 'string',
		projectId: 'string',
		organizationId: 'string',
		csvobjId: 'string',
		speciesTemp: 'string',
		// cropId: "string",
		cropName: 'string',
		// cropId: "string",
		planted: 'number',
		plantingDate: 'date',
		createdAt: 'date',
		lastEditedAt: 'date',
		deleted: 'string',
		planting_notes: 'string'
	};

	// Temporary workaround to get the page working
	console.log('Using mock data while Prisma issues are resolved');

	// Return mock data that matches the expected structure
	const landsDbTable = [
		{
			landId: 'mock-id-1',
			landName: 'North Field',
			hectares: 10.5,
			projectId: 'proj-123',
			gpsLat: 37.7749,
			gpsLon: -122.4194,
			landNotes: 'Good soil quality',
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString()
		},
		{
			landId: 'mock-id-2',
			landName: 'South Field',
			hectares: 8.2,
			projectId: 'proj-123',
			gpsLat: 37.775,
			gpsLon: -122.4195,
			landNotes: 'Rocky in parts',
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString()
		}
	];

	const plantingDbTable = [
		{
			plantingId: 'mock-planting-1',
			landId: 'mock-id-1',
			cropId: 'mock-crop-1',
			planted: 100,
			plantingDate: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString(),
			plantingNotes: 'First planting'
		},
		{
			plantingId: 'mock-planting-2',
			landId: 'mock-id-2',
			cropId: 'mock-crop-2',
			planted: 50,
			plantingDate: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString(),
			plantingNotes: 'Second planting'
		}
	];

	const cropDbTable = [
		{
			cropId: 'mock-crop-1',
			cropName: 'Tomatoes',
			seedInfo: 'Heirloom',
			cropStock: 'In stock',
			projectId: 'proj-123',
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString()
		},
		{
			cropId: 'mock-crop-2',
			cropName: 'Corn',
			seedInfo: 'Sweet',
			cropStock: 'Low stock',
			projectId: 'proj-123',
			createdAt: new Date().toISOString(),
			lastEditedAt: new Date().toISOString()
		}
	];

	return {
		landsDbTable,
		plantingDbTable,
		cropDbTable,
		landDbFormat,
		plantingDbFormat,
		cropDbFormat
	};
};

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
