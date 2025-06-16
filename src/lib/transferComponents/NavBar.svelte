<script lang="ts">
	import AccountMenu from '$lib/transferComponents/AccountMenu.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let user = $state(null);

	onMount(() => {
		// Get initial session
		const { data } = supabase.auth.getSession();
		user = data?.session?.user || null;

		// Subscribe to auth changes
		const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
			user = session?.user || null;
		});

		return () => {
			if (authListener?.subscription) {
				authListener.subscription.unsubscribe();
			}
		};
	});
</script>

<div class="header-container">
	<h1>OSEM🤘🌲</h1>

{#if user}
<nav>
    <div class="container-fluid p-1">
        <a href="/">Home</a>
        <a href="/transform">Transform</a>
        <a href="/transplant">Transplant</a>
        <br />
        <br />
    </div>
</nav>
{/if}

	<AccountMenu />
</div>



<p>Visit <a href="https://github.com/OSEMSAUCE/OSEM">github.com/OSEMSAUCE</a> to learn more...</p>

<style>
	.header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
</style>
