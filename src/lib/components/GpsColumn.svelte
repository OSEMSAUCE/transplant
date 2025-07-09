<!-- GpsColumn.svelte: Modular GPS column for use in table header and body -->

<script lang="ts">
  
  // For header: no props needed
  // For cell: expects gpsData (object) and isMatch (boolean)
  export let gpsData: GpsData | null = null;
  export let isMatch = false;
  interface GpsData {
    type: 'full' | 'pair';
    value?: string;
    lat?: number;
    lon?: number;
  }
</script>

<!-- Header usage -->
{#if !gpsData}
  <th class="gps-column">
    <div class="column-header">
      <span class="format-label">GPS</span>
    </div>
    <div class="header-name"></div>
  </th>
{:else}
  <!-- Cell usage -->
  <td style="position: relative; padding: 8px;" class:isGpsMatch={isMatch}>
    {#if gpsData}
      <div class="gps-cell">
        <span class="gps-coordinates">
          {#if gpsData.type === 'full'}
            {gpsData.value}
          {:else if gpsData.type === 'pair'}
            {gpsData.lat}, {gpsData.lon}
          {/if}
        </span>
      </div>
    {/if}
  </td>
{/if}
