<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import toast from 'svelte-french-toast';
	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	async function handleSignIn(event: Event) {
		event.preventDefault();
		if (!email || !password) {
			error = 'Please enter both email and password.';
			return;
		}
		error = '';
		loading = true;
		toast.loading('Signing in...');
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		toast.dismiss();
		loading = false;
		if (signInError) {
			toast.error(signInError.message);
			error = signInError.message;
			return;
		}
		toast.success('Signed in successfully');
		// Redirect to signed-in homepage
		goto('/');
	}
</script>

<div class="login-container">
	<h2>Sign In</h2>
	<form onsubmit={handleSignIn}>
		<label for="email">Email</label>
		<input id="email" type="email" bind:value={email} required />

		<label for="password">Password</label>
		<input id="password" type="password" bind:value={password} required />

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<button type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
	</form>
</div>
