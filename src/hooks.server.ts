// src/hooks.server.ts
import { redirect } from '@sveltejs/kit';

// src/hooks.server.ts
const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export async function handle({ event, resolve }) {
  const { url, cookies } = event;
  const isPublic = PUBLIC_ROUTES.some((route) => url.pathname === route);

  // Check for a session token (customize this for your auth system)
  const token = cookies.get('session_token');

  if (!isPublic && !token) {
    // Not authenticated and not on a public route
    throw redirect(303, '/login');
  }

  // If authenticated or on a public route, continue
  return resolve(event);
}