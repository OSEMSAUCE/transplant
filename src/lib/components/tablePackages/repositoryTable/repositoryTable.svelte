<script lang="ts">
  import type { ColumnDef } from '@tanstack/svelte-table';
  import type { Repository } from '@prisma/client';
  import MainTable from '../../tableComponents/mainTable.svelte';
  import SearchComp from "../../tableComponents/searchComp.svelte";

  export let data: Repository[];
 
  const columns: ColumnDef<Repository>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'link',
      header: 'Link',
      cell: (info) => `<a href="${info.getValue()}" target="_blank">${info.getValue()}</a>`,
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      accessorKey: 'size',
      header: 'Size',
    },
    {
      accessorKey: 'blurb',
      header: 'Description',
    },
  ];
</script>

<MainTable {data} {columns} />
