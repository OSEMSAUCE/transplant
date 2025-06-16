// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_K } from '$env/static/public';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback'];

export const handle: Handle = async ({ event, resolve }) => {
  // Create a Supabase client for this request
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_K,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: options?.path || '/' });
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: options?.path || '/' });
        }
      }
    }
  );

  // Get session from the request
  event.locals.getSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();
    return session;
  };

  // Check if route requires authentication
  const session = await event.locals.getSession();
  const isPublic = PUBLIC_ROUTES.some(route => event.url.pathname === route || event.url.pathname.startsWith('/auth/'));

  if (!isPublic && !session) {
    // Not authenticated and not on a public route
    throw redirect(303, '/login');
  }

  // Handle the request
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    }
  });
}