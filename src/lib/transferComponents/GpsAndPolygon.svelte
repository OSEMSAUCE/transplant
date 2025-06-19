<script lang="ts">
	import {
		isGps,
		isLatitude,
		isLongitude,
		formatAllGpsTypes,
		formatValue
	} from './formatDetection2';
	import { importedData } from '$lib/transferComponents/modelState.svelte';

	// Props to make this component flexible for both CSV and DB tables
	const {
		// Whether to show the component in header or body mode
		isHeader = false,
		// For DB table, we need to know which row to display
		uniqueRowIndex = 0,
		// Functions to get GPS and Polygon data
		pullFirstGpsSelected = defaultPullFirstGpsSelected,
		pullFirstPolygonSelected = defaultPullFirstPolygonSelected,
		// For DB table, we need to get the land ID for a row
		getLandIdForRow = () => null,
		// Whether this is collapsed (DB table) or expanded (CSV table)
		isCollapsed = false
	} = $props();

	// Default implementation for CSV table
	function defaultPullFirstGpsSelected(rowIndex: number) {
		// First try to find a full GPS coordinate pair
		for (const column of importedData.columns) {
			if (
				column.currentFormat === 'gps' &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				const gpsValue = column.values[rowIndex];
				if (isGps(gpsValue)) {
					return { type: 'full', value: gpsValue };
				}
			}
		}

		// Try to find a complete latitude/longitude pair
		let latValue: string | number | null = null;
		let lonValue: string | number | null = null;

		// First pass: look for explicit latitude and longitude columns
		for (const column of importedData.columns) {
			const value = column.values[rowIndex];

			if (value === null || value === '') continue;

			// Check for latitude column
			if (column.currentFormat === 'latitude' && !latValue) {
				if (isLatitude(value)) {
					latValue = value;
				}
			}

			// Check for longitude column
			if (column.currentFormat === 'longitude' && !lonValue) {
				if (isLongitude(value)) {
					lonValue = value;
				}
			}
		}

		// If we found a complete pair, return it
		if (latValue !== null && lonValue !== null) {
			return { type: 'pair', lat: latValue, lon: lonValue };
		}

		// If we couldn't find a complete pair of valid coordinates, return null
		return null;
	}

	function defaultPullFirstPolygonSelected(rowIndex: number) {
		// Try to find a polygon column
		for (const column of importedData.columns) {
			if (
				(column.currentFormat === 'polygon' || column.currentFormat === 'kml') &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				// Format polygon data to be more readable
				const polygonValue = column.values[rowIndex];
				let formattedValue = polygonValue;
				
				// If it's a complex polygon, try to make it more readable
				if (typeof polygonValue === 'string' && polygonValue.includes('[') && polygonValue.includes(',')) {
					try {
						// Try to parse as JSON to get point count
						const points = JSON.parse(polygonValue);
						if (Array.isArray(points)) {
							formattedValue = `Polygon: ${points.length} points`;
						}
					} catch (e) {
						// If parsing fails, use a simple format
						formattedValue = `Polygon data`;
					}
				}
				return { value: formattedValue, raw: polygonValue };
			}
		}
		return null;
	}
</script>

{#if isHeader}
	
	<th>
		<div>
			<span>GPS</span>
		</div>
		<div></div>
	</th>
	
	<th>
		<div>
			<span>Polygon</span>
		</div>
		<div></div>
	</th>
{:else}
	
	<td>
		{#key uniqueRowIndex}
			{@const gpsResult = pullFirstGpsSelected(uniqueRowIndex)}
			{#if gpsResult}
				<div>
					<span>
						{#if gpsResult.type === 'full'}
							{gpsResult.value}
						{:else if gpsResult.type === 'pair'}
							{gpsResult.lat}, {gpsResult.lon}
						{/if}
					</span>
				</div>
			{/if}
		{/key}
	</td>
	
	<td>
		<div>
			{#key uniqueRowIndex}
				{@const landId = getLandIdForRow(uniqueRowIndex)}
				{@const gpsResult = pullFirstGpsSelected(uniqueRowIndex)}
				{@const polygonData = pullFirstPolygonSelected(uniqueRowIndex)}
				{#if landId && landId.polygonId}
					<span>Polygon ID: {landId.polygonId}</span>
				{:else if polygonData}
					<span class="polygon-coordinates">
						{polygonData.value}
					</span>
				{:else if gpsResult}
					<span>
						
					</span>
				{/if}
			{/key}
		</div>
	</td>
{/if}
