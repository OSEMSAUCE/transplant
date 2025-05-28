
import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';

// select projectName and looking ProjectStakeholders, 

export async function GET() {
  try {
    // Query only projectName from Projects
    const projects = await prisma.projects.findMany({
      select: { projectName: true, projectId: true },
      where: { deleted: false }, // Only non-deleted projects
      orderBy: { projectName: 'asc' }
    });
    // Map to array of strings
    console.log( projects)
    return json({ projects });
  } catch (error) {
    console.error('Failed to fetch project names:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch project names' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}