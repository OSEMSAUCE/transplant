// import { Organizations } from './../../../../node_modules/.prisma/client/index.d';

import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';

// select projectName and looking ProjectStakeholders,

export async function GET() {
	try {
		// Query only projectName from Projects
		const projects = await prisma.projectsTable.findMany({
			select: { projectName: true, projectId: true },
			where: { deleted: false }, // Only non-deleted projects
			orderBy: { projectName: 'asc' }
		});
		const organizations = await prisma.organizationsTable.findMany({
			select: { organizationName: true, organizationId: true },
			where: { deleted: false }, // Only non-deleted projects
			orderBy: { organizationName: 'asc' }
		});
		// Map to array of strings

		return json({ projects, organizations });
	} catch (error) {
		console.error('Failed to fetch project names:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch project names' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export async function POST({ request }) {
	const data = await request.json();
	return json({ message: 'Project added successfully' });
}

// export async function GET() {
//   try {
//     // Query only projectName from Projects
//     const organizations = await prisma.organizations.findMany({
//       select: { organizationName: true, organizationId: true },
//       where: { deleted: false }, // Only non-deleted projects
//       orderBy: { organizationName: 'asc' }
//     });
//     // Map to array of strings
//     console.log( organizations)
//     return json({ organizations });
//   } catch (error) {
//     console.error('Failed to fetch project names:', error);
//     return new Response(
//       JSON.stringify({ error: 'Failed to fetch project names' }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// }
