<!-- GpsColumn.svelte: Modular GPS column for use in table header and body -->

<script lang="ts">
  import { importedData } from '$lib/components/modelState.svelte';
  import { getDuplicatedMask } from './columnNormalizationUtils';
  
  // Convert export let to $props() for Svelte 5 runes mode
  const { gpsData = null, isMatch = false, header = false, rowIndex = null } = $props<{
    gpsData?: GpsData | null;
    isMatch?: boolean;
    header?: boolean;
    rowIndex?: number | null;
  }>();

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
  
  // State to store GPS duplicated masks
  const gpsDuplicatedMask = $state<boolean[]>([]);
  
  // Update the duplicated mask whenever importedData changes
  $effect(() => {
    // Simple approach - just use getDuplicatedMask directly
    const gpsValues: (string | number | null)[] = [];
    
    // Only process if we have data
    if (importedData.columns[0]?.values.length > 0) {
      // Collect GPS values
      for (let i = 0; i < importedData.columns[0].values.length; i++) {
        const gpsData = extractGpsData(i);
        gpsValues[i] = gpsData ? formatGps(gpsData) : null;
      }
      
      // Use the existing utility function
      const mask = getDuplicatedMask(gpsValues);
      
      // Update our state
      gpsDuplicatedMask.length = 0;
      for (let i = 0; i < mask.length; i++) {
        gpsDuplicatedMask[i] = mask[i];
      }
      
      // Just log a count, not the full details
      const dupCount = mask.filter(Boolean).length;
      if (dupCount > 0) {
        console.log(`GPS column has ${dupCount} duplicated values`);
      }
    }
  });
</script>

{#if header}
  <th class="gps-column">
    <div class="column-header">
      <span class="format-label">GPS</span>
    </div>
    <div class="header-name"></div>
  </th>
{:else}
  <td style="position: relative; padding: 8px;" 
    class:isGpsMatch={isMatch}
    class:isDuplicated={rowIndex !== null && gpsDuplicatedMask[rowIndex] === true}>
    {#if gpsData}
      <div class="gps-cell">
        <span class="gps-coordinates">{formatGps(gpsData)}</span>
      </div>
    {:else if rowIndex !== null}
      {@const extractedData = extractGpsData(rowIndex)}
      {#if extractedData}
        <div class="gps-cell">
          <span class="gps-coordinates">{formatGps(extractedData)}</span>
        </div>
      {/if}
    {/if}
  </td>
{/if}

<style>
  /* Styling for duplicated cells - matching the style from TpCsvTable */
  td.isDuplicated {
    background-color: rgba(213, 106, 44, 0.1) !important;
    position: relative !important;
  }

  td.isDuplicated::after {
    content: '' !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 2px !important;
    /* background-color: rgba(255, 160, 120, 0.7); */
  }

  /* Make sure the duplicate highlighting doesn't interfere with other styles */
  td.isDuplicated:hover {
    background-color: rgba(255, 220, 200, 0.6) !important;
  }
  
  /* Override any other styles that might be interfering */
  td.isDuplicated {
    z-index: 3 !important; /* Higher than the sticky z-index */
  }
</style>