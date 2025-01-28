<script lang="ts">
  import type { Table } from '@tanstack/svelte-table';
  import type { RepositoryType } from '$lib/types/dataTypes';

  export let backNext: Table<RepositoryType>;

  function handleBackClick() {
    backNext.previousPage();
  }

  function handleNextClick() {
    backNext.nextPage();
  }
</script>

<div class="pagination-controls">
  <button class="back-button" on:click={handleBackClick} disabled={!backNext.getCanPreviousPage()}>
    ◄ back
  </button>
  <button class="next-button" on:click={handleNextClick} disabled={!backNext.getCanNextPage()}>
    next ►
  </button>
</div>
