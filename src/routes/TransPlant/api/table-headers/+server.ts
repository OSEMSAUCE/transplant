import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    // These are the database fields that can be mapped to
    const headers = [
      'name',
      'link',
      'type',
      'size',
      'blurb',
      'tagIds'
    ];
    
    return json(headers);
  } catch (e) {
    console.error('Error in table-headers endpoint:', e);
    throw error(500, {
      message: 'Failed to get table headers'
    });
  }
};
