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
  <div class="nav-left">
    <h1>OSEM🤘🌲</h1>
    <nav class="nav-links">
      <a href="/">Home</a>
      <a href="/transform">Transform</a>
      <a href="/transplant">Transplant</a>
    </nav>
  </div>
  <div class="nav-right">
    <a href="https://github.com/OSEMSAUCE/OSEM" target="_blank" rel="noopener noreferrer" aria-label="Visit OSEMSAUCE on GitHub" class="github-logo">
      <svg height="32" width="32" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
      </svg>
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
.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}
.nav-links {
  display: flex;
  gap: 18px;
  align-items: center;
  font-size: 1.15rem;
  line-height: 1.2;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 40px; /* Fixed height container */
}
.nav-links a {
  padding: 0.15rem 0.2rem;
  margin: 0 0.2rem 0 0;
  color: var(--color-purple) !important;
  background: none;
  border: none;
  font-size: inherit;
  line-height: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-purple) !important;
  transition: color 0.2s, text-decoration-color 0.2s;
}
.nav-links a:hover {
  color: #b663df !important;
  text-decoration-color: var(--color-purple) !important;
}
.github-logo {
  display: flex;
  align-items: center;
  padding: 0;
  color: #fff;
  transition: color 0.15s;
  height: 100%;
}
.github-logo svg {
  display: block;
  height: 32px;
  width: 32px;
  transform: translateY(-3px); /* Fine-tune vertical position */
}
.github-logo:hover {
  color: #8b949e;
}
</style>
