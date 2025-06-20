import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || '/';

	if (code) {
		// This is the key flow for email verification - exchange code for session
		await supabase.auth.exchangeCodeForSession(code);
	}

	// Redirect after processing
	throw redirect(303, next);
};
