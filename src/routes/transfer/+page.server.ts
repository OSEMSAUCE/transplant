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
	// const landsDbTable = await db.select().from(land).limit(1);
	// const plantingDbTable = await db.select().from(planting).limit(1);
	// const cropDbTable = await db.select().from(crop).limit(1);
	// // console.log(land.gpsLat.columnType);
	const landDbFormat = {
			landId:	"string",
			landName:	"string",
			projectId:	"string",
			hectares:	"number",
			landHolder:	"string",
			polygonId:	"string",
			gpsLat:	"number",
			gpsLon:	"number",
			landNotes:	"string",
			createdAt:	"date",
			lastEditedAt:	"date",
			editedBy:	"string",
			deleted:	"string",
			preparation:	"string",
			preparationId:	"number",
			csvobjId:	"string",
			polygon:	"string",
			project:	"string",
			csvobj:	"string",
			preparationType:	"string",
			plantings:	"string",
		}
				
		const cropDbFormat = {
			cropId:	"string",
			cropName:	"string",
			speciesId:	"string",
			seed_info:	"string",
			cropStock:	"string",
			createdAt:	"date",
			lastEditedAt:	"date",
			editedBy:	"string",
			deleted:	"string",
			projectId:	"string"	,
			organizationId:	"string",
			cropNotes:	"string",
			csvobjId:	"string",
			species:	"string",
			organization:	"string",
			project:	"string",
			csvobj:	"string",
			plantings:	"string",
		}

		const plantingDbFormat = {
			plantingId:	"string",
			landId:	"string",
			planted:	"number",
			plantingDate:	"date",
			createdAt:	"date",
			lastEditedAt:	"date",
			deleted:	"string",
			cropId:	"string",
			planting_notes:	"string",
		}

	const landsDbTable = await prisma.land.findMany({ take: 3 });
	const plantingDbTable = await prisma.planting.findMany({ take: 3 });
	const cropDbTable = await prisma.crop.findMany({ take: 3 });
	
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

// interface ColumnDescription {
// 	columnType:
// 		| 'PgNumeric'
// 		| 'PgDateString'
// 		| 'PgUUID'
// 		| 'PgText'
// 		| 'PgTimestampString'
// 		| 'PgBoolean'
// 		| 'PgEnumColumn'
// 		| 'PgBigInt53'
// 		| 'PgInteger';
// 	dataType: 'number' | 'string' | 'boolean' | 'date' | 'gps';
// 	// Add other properties if they exist
// }

// new FormatSelector match method 7 May 2025 

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
