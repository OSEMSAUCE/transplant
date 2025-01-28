<script lang="ts" context="module">
  import type { FilterFn } from '@tanstack/svelte-table';
  import { rankItem } from '@tanstack/match-sorter-utils';

  export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta({ itemRank });
    return itemRank.passed;
  };
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let searchTerm = '';

  function handleInput() {
    dispatch('search', searchTerm);
  }
</script>

<input type="text" bind:value={searchTerm} on:input={handleInput} placeholder="Fuzzy Search...">