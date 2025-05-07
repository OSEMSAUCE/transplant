// src/lib/server/prisma.ts
import { PrismaClient } from '@prisma/client';

// Create a singleton instance of the PrismaClient
const prisma = new PrismaClient();

export { prisma };

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