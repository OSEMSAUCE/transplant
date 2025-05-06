// http://localhost:5173/api/submitToDB
import { json } from '@sveltejs/kit';

export async function POST() {
    console.log('API: Submit to DB request received');
    return json({ message: 'Submit to DB request received' });
}