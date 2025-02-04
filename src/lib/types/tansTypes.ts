import type { FilterFn } from '@tanstack/svelte-table';
import type { RankingInfo } from '@tanstack/match-sorter-utils';

declare module '@tanstack/svelte-table' {
	interface FilterFns {
		fuzzy: FilterFn<unknown>;
	}
	interface FilterMeta {
		itemRank: RankingInfo;
	}
}