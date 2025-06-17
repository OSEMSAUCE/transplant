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
  <div class="left-logo">
    <h1>OSEM🤘🌲</h1>
  </div>

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

  <div class="right-controls">
    <a href="https://github.com/OSEMSAUCE/OSEM" target="_blank" rel="noopener noreferrer" aria-label="Visit OSEMSAUCE on GitHub" class="github-logo">
      <svg height="42" width="42" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>
    </a>
    <AccountMenu />
  </div>
</div>

<style>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;  
  margin-bottom: -0.5rem;
  padding: 0.5rem 0.5rem 0.1rem 0.5rem;
}
.left-logo {
  display: flex;
  align-items: center;
}
.right-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
.github-logo {
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: #fff;
  transition: color 0.15s;
}
.github-logo:hover {
  color: #8b949e;
}
</style>
