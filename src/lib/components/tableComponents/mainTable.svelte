<script lang="ts">
  import {
    createSvelteTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
  } from '@tanstack/svelte-table';
  import type { ColumnDef } from '@tanstack/svelte-table';
  export let data;
  export let columns;
  import SearchComp from './searchComp.svelte';
  import SearchCompFuzzy from './searchCompFuzzy.svelte';
  import BackNext from './backNext.svelte';

  let globalFilter = '';
  $: table = createSvelteTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  function setGlobalFilter(value: string) {
    globalFilter = value;
  }

  function handleSearch(event: CustomEvent<string>) {
    setGlobalFilter(event.detail);
  }

  let tableContainer: HTMLElement;
  let fixedHeader: HTMLElement;
  let isSearchVisible = true;

  function handleScroll() {
    isSearchVisible = tableContainer.scrollTop === 0;
  }
</script>

<div class="table-wrapper">
  <div class="fixed-header" bind:this={fixedHeader}>
    <div class="search-container" class:hidden={!isSearchVisible}>
      <SearchComp on:search={handleSearch} />
      <SearchCompFuzzy on:search={handleSearch} />
    </div>
    <table>
      <thead>
        {#each $table.getHeaderGroups() as headerGroup}
          <tr>
            {#each headerGroup.headers as header}
              <th>
                {#if !header.isPlaceholder}
                  <div
                    class="th-content"
                    on:click={() => header.column.toggleSorting()}
                    style="cursor: pointer;"
                  >
                    {header.column.columnDef.header}
                    <span class="sort-indicator" class:active={header.column.getIsSorted()}>
                      {header.column.getIsSorted() === 'desc' ? '▼' : '▲'}
                    </span>
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>
    </table>
  </div>

  <div class="table-container" bind:this={tableContainer} on:scroll={handleScroll}>
    <table>
      <tbody>
        {#each $table.getRowModel().rows as row}
          <tr>
            {#each row.getVisibleCells() as cell}
              <td>
                {@html cell.column.columnDef.cell
                  ? cell.column.columnDef.cell(cell.getContext())
                  : cell.getValue()}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
<BackNext backNext={$table} />
