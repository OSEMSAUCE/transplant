

const fakeData = [{
	column1: "string",
	col2: 2,
	col3: 3
}]

const fakeFormats = {
	column1: "string",
	col2: "number",
	col3: "number"
}


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
	// const landDbFormat = dbFormatSelector(land);
	// const plantingDbFormat = dbFormatSelector(planting);
	// const cropDbFormat = dbFormatSelector(crop);
	// console.log('dbFormat', landDbFormat);
	return {
		landsDbTable: fakeData,
		plantingDbTable: fakeData,
		cropDbTable: fakeData,
		landDbFormat: fakeFormats,
		plantingDbFormat: fakeFormats,
		cropDbFormat: fakeFormats
	};

}

// Example: src/lib/db/columnFormats.ts

const landDbFormat = {
	landName: "string",
	hectares: "number",
	landHolder: "string",
	gpsLat: "number",
	gpsLon: "number",
	landNotes: "string"
	// ...etc
  };

const cropDbFormat = {
	cropName: "string",
	
}

const plantingDbFormat = {
	plantingDate: "date",
	// ...etc
}

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

// // 🌲️🌲️🌲️🌲️🌲️🌲️🌲️🌲️ Selector Types for db table 🌲️🌲️🌲️🌲️
// function dbFormatSelector(table: PgTableWithColumns<any>) {
// 	let columnFormats: Record<string, string> = {};
// 	for (const [columnName, column] of Object.entries(table)) {
// 		if (column && typeof column === 'object' && 'columnType' in column) {
// 			const columnDescription = column as ColumnDescription;
// 			let format = 'string';
// 			if (columnDescription.dataType === 'number') {
// 				format = 'number';
// 			} else if (
// 				columnDescription.columnType === 'PgNumeric' ||
// 				columnDescription.columnType === 'PgInteger'
// 			) {
// 				format = 'number';
// 			} else if (columnDescription.columnType === 'PgDateString') {
// 				format = 'date';
// 			} else if (columnDescription.columnType === 'PgUUID') {
// 				format = 'string';
// 			} else if (columnDescription.columnType === 'PgText') {
// 				format = 'string';
// 			} else if (columnDescription.columnType === 'PgTimestampString') {
// 				format = 'date';
// 			} else if (columnDescription.columnType === 'PgBoolean') {
// 				format = 'string';
// 			} else if (columnDescription.columnType === 'PgEnumColumn') {
// 				format = 'string';
// 			} else if (columnDescription.columnType === 'PgBigInt53') {
// 				format = 'number';
// 			}
// 			columnFormats[columnName] = format;
// 		}
// 	}
// 	return columnFormats;
// }
