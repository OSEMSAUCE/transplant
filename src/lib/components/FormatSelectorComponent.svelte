<script lang="ts">
	import { formatGreyedStatus, importedData } from '$lib/components/modelState.svelte';
	import type { ColumnFormat } from '$lib/types/columnModel';
	// 17 May 2025 11:21 AM
	const {
		columnData = [],
		currentFormat = 'string',
		currentColumnHeader = '',
		onformatchange = () => {},
		isTransplant = false,
		isToggled = true
	} = $props<{
		columnData?: Array<string | number | null>;
		currentFormat?: string;
		currentColumnHeader?: string;
		onformatchange?: (
			event: CustomEvent<{ destinationFormat: string; headerName: string }>
		) => void;
		isTransplant?: boolean;
		isToggled?: boolean;
	}>();

	const formats = ['string', 'number', 'date', 'gps', 'latitude', 'longitude', 'polygon'];

	let selectedFormat = $state(currentFormat === 'kml' ? 'polygon' : currentFormat);
	let hasUserSelectedFormat = $state(false);

	//  TODO: later once I solve select detect thing, change this function to
	//instead use direcly updating state importedData.columns
	function handleChange(event: Event) {
		hasUserSelectedFormat = true;
		const dropdown = event.target as HTMLSelectElement;
		const newFormat = dropdown.value;
		console.log('Format changed to:', newFormat);
		selectedFormat = newFormat;

		// Directly update the state
		const columnIndex = importedData.columns.findIndex(
			(col) => col.headerName === currentColumnHeader
		);
		if (columnIndex !== -1) {
			// If the format is polygon and the original was kml, keep it as kml
			const formatToUse = newFormat === 'polygon' && currentFormat === 'kml' ? 'kml' : newFormat;
			importedData.columns[columnIndex].type = formatToUse as ColumnFormat;
			formatGreyedStatus(importedData.columns, columnIndex, formatToUse as ColumnFormat);
		}

		const customEvent = new CustomEvent('formatchange', {
			detail: {
				destinationFormat: newFormat,
				headerName: currentColumnHeader
			},
			bubbles: true
		});
		onformatchange(customEvent);
	} // Here's the key addition - dispatch the event
</script>

<div
	class="format-selector"
	style={!isToggled && isTransplant ? 'width: 0; padding: 0; margin: 0; overflow: hidden;' : ''}
>
	{#if isToggled || !isTransplant}
		<select
			bind:value={selectedFormat}
			onchange={handleChange}
			disabled={isTransplant}
			style="background-color: {selectedFormat === 'string'
				? 'rgba(156, 39, 176, 0.4)' // purple for string
				: selectedFormat === 'number'
					? 'rgba(33, 150, 243, 0.4)' // blue for number
					: selectedFormat === 'date'
						? 'rgba(255, 152, 0, 0.4)' // orange for date
						: selectedFormat === 'gps'
							? 'rgba(76, 175, 80, 0.4)' // green for gps
							: selectedFormat === 'polygon'
								? 'rgba(219,43,155,0.4)' // brown for polygon
								: selectedFormat === 'latitude' || selectedFormat === 'longitude'
									? 'rgba(35,160,42, 0.4)' // teal for lat/lon
									: 'rgba(158, 158, 158, 0.4)'}"
		>
			{#each formats as format}
				<option value={format}>{format}</option>
			{/each}
		</select>
	{/if}
</div>
