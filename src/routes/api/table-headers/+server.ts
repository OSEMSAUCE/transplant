import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
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
};
