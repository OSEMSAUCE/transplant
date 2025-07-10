<!-- GpsColumn.svelte: Modular GPS column for use in table header and body -->

<script lang="ts">
	import { importedData } from '$lib/components/modelState.svelte';
	export let gpsData: GpsData | null = null;
	export let isMatch = false;
	export let header = false; // Explicitly mark header usage
	export let rowIndex: number | null = null; // Optional: row index for auto-extraction

	interface GpsData {
		type: 'full' | 'pair';
		value?: string;
		lat?: number;
		lon?: number;
	}

	// Utility: extract GPS data for a given row index using naming rules
	function extractGpsData(rowIndex: number): GpsData | null {
		// Try to find a full GPS coordinate pair
		for (const column of importedData.columns) {
			if (
				column.currentFormat === 'gps' &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				const gpsValue = column.values[rowIndex];
				if (isGps(gpsValue)) {
					return { type: 'full', value: String(gpsValue) };
				}
			}
		}
		// Try to find a complete latitude/longitude pair using column names
		let latValue: string | number | null = null;
		let lonValue: string | number | null = null;
		for (const column of importedData.columns) {
			const value = column.values[rowIndex];
			if (value === null || value === '') continue;
			const name = column.headerName?.toLowerCase().replace(/[\s_]+/g, '');
			if (!latValue && name && name.includes('lat')) {
				latValue = Number(value);
			} else if (!lonValue && name && name.includes('lon')) {
				lonValue = Number(value);
			}
		}
		if (latValue !== null && lonValue !== null) {
			return { type: 'pair', lat: latValue, lon: lonValue };
		}
		return null;
	}

	// Utility: format GPS data for display
	function formatGps(gpsData: GpsData): string {
		if (gpsData.type === 'full') return gpsData.value ?? '';
		if (gpsData.type === 'pair') return `${gpsData.lat}, ${gpsData.lon}`;
		return '';
	}

	// Import isGps utility from your detection module
	import { isGps } from './formatDetection2';
</script>

{#if header}
	<th class="gps-column">
		<div class="column-header">
			<span class="format-label">GPS</span>
		</div>
		<div class="header-name"></div>
	</th>
{:else}
	<td style="position: relative; padding: 8px;" class:isGpsMatch={isMatch}>
		{#if gpsData}
			<div class="gps-cell">
				<span class="gps-coordinates">{formatGps(gpsData)}</span>
			</div>
		{:else if rowIndex !== null}
			{#if extractGpsData(rowIndex)}
				<div class="gps-cell">
					<span class="gps-coordinates">{formatGps(extractGpsData(rowIndex))}</span>
				</div>
			{/if}
		{/if}
	</td>
{/if}
