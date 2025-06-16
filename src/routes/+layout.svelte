<script lang="ts">
	import '../lib/styles/custom-pico.scss';
	import { Toaster } from 'svelte-french-toast';

	let { children } = $props();
</script>

<Toaster />
<br />
<nav>
	<div class="container-fluid p-1">
		<a href="/">Home</a>
		<a href="/transform">Transform</a>
		<a href="/transplant">Transplant</a>
		<br />
		<br />
	</div>
</nav>

<main class="container-fluid p-1">
	{@render children?.()}
</main>
