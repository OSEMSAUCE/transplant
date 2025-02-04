import type { ColumnDef } from '@tanstack/svelte-table';
import type { Repository } from '@prisma/client';
import { createTableStore } from '../../tableComponents/tableStore';

export function createRepositoryTableStore(initialData: Repository[], columns: ColumnDef<Repository>[]) {
  return createTableStore<Repository>(initialData, columns);
}
