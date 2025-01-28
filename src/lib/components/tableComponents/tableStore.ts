// src/lib/components/tableComponents/tableStore.ts
import { writable } from 'svelte/store';
import type { TableOptions, ColumnDef } from '@tanstack/svelte-table';
import { createSvelteTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/svelte-table';

export function createTableStore<T>(initialData: T[], columns: ColumnDef<T>[]) {
  const options = writable<TableOptions<T>>({
    data: initialData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting: [{ id: 'name', desc: false }],
      globalFilter: '',
    },
  });

  const table = createSvelteTable(options);

  return {
    options,
    table,
    setGlobalFilter: (filter: string) => options.update(opts => ({ ...opts, state: { ...opts.state, globalFilter: filter } })),
  };
}

