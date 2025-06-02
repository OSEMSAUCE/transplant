// src/lib/server/prisma.ts
import { PrismaClient } from '@prisma/client';
// import { PrismaClient } from '../../../lib/generated/prisma';


const prisma = new PrismaClient();

export default prisma;
