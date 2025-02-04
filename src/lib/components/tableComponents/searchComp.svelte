<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    let searchTerm = '';

    function handleInput() {
        dispatch('search', searchTerm);
    }
</script>

<input type="text" bind:value={searchTerm} on:input={handleInput} placeholder="Search by name..." />
