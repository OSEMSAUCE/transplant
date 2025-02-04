<!-- Link.svelte -->
<script lang="ts">
  export let href: string = '#';
</script>

{#if href && href !== '#'}
  <a {href} target="_blank" rel="noopener noreferrer">{href}</a>
{:else}
  <span>No link available</span>
{/if}

<!-- <script lang="ts">
  export let href: string;
</script>

<a {href} target="_blank" rel="noopener noreferrer">{href}</a> -->
