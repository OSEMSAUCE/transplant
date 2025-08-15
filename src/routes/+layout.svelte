<script lang="ts">
	import '../lib/styles/custom-pico.scss';
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import NavBar from '$lib/components/NavBar.svelte';

	let { children } = $props();
</script>

<SvelteToast />
<NavBar />
<br />

<main class="container-fluid p-1">
	{@render children?.()}
</main>
