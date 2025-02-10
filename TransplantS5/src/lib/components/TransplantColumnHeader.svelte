<script lang="ts">
  export let name: string;
  export let excluded = false;
  export let onExclude: (isExcluded: boolean) => void;
  export let mappings: Record<string, string>;
  export let databaseFields: Record<string, string[]>;

  let isValidMapping = $state(false);
  let isMapped = $state(false);

  // Track if this column is mapped and check validation
  $effect(() => {
    const mapping = mappings[name];
    isMapped = !!mapping;
    if (!mapping) {
      isValidMapping = false;
    } else {
      // If mapped to 'planted', don't show as valid since it requires numbers
      const [table, field] = mapping.split('.');
      // Only planted field needs special validation
      isValidMapping = field !== 'planted';
    }
  });

  // Reset exclusion when column is mapped
  $effect(() => {
    if (isMapped && excluded) {
      onExclude(false);
    }
  });
</script>

<div
  class="text-white"
  style="
    width: var(--column-width); 
    background-color: {excluded ? '#4a4a4a' : '#12191F'};
    border: none;
    margin: 0;
  "
>
  <div style="display: grid; place-items: center;" class="p-2">
    {#if !isMapped}
      <div class="flex items-center gap-2">
        <span class="text-white font-bold">X</span>
        <input
          type="checkbox"
          checked={excluded}
          on:change={(e) => onExclude(e.currentTarget.checked)}
        />
      </div>
    {/if}
  </div>
  <select
    bind:value={mappings[name]}
    class="w-full text-white border border-gray-600 rounded p-1 cursor-pointer appearance-none hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
    class:mapped={isValidMapping}
    style="
      background-color: {excluded ? '#4a4a4a' : '#12191F'};
      background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'white\' d=\'M7 10l5 5 5-5z\'/></svg>');
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1rem;
      padding-right: 1.5rem;
    "
  >
    <option value="">--</option>
    <optgroup label="Planting Data (Main Interface)">
      {#each databaseFields.Planted as field}
        <option value={`Planted.${field}`}>{field}</option>
      {/each}
    </optgroup>
    <optgroup label="Crop Data">
      {#each databaseFields.Crop as field}
        <option value={`Crop.${field}`}>{field}</option>
      {/each}
    </optgroup>
  </select>
</div>

<style>
  /* Override any other styles with high specificity */
  select.mapped:not([multiple]):not([size]) {
    border: 2px solid #4fff4f !important;
    background-color: var(--background-color);
    color: var(--color);
    /* Reset other potentially conflicting styles */
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }
</style>
  