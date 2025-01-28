import type { PageServerLoad } from './$types';
import { prisma } from '$lib/prisma';

export const load: PageServerLoad = async () => {
  const repositories = await prisma.repository.findMany();
  return { repositories };
};
