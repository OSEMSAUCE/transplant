<script lang="ts">
	import '../lib/styles/custom-pico.scss';
	import { Toaster } from 'svelte-french-toast';
	import NavBar from '$lib/transferComponents/NavBar.svelte';

	let { children } = $props();
</script>

<Toaster />
<NavBar />
<br />

<main class="container-fluid p-1">
	{@render children?.()}
</main>
