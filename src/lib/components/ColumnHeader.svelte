<script lang="ts">
  export let name: string;
  export let excluded = false;
  export let onExclude: (isExcluded: boolean) => void;
  export let mappings: Record<string, string>;
  export let databaseFields: Record<string, string[]>;
</script>

<div class="p-2 bg-gray-800 text-white" style="width: 100%; opacity: {excluded ? '0.5' : '1'}">
  <label class="exclude-toggle">
    <input
      type="checkbox"
      checked={excluded}
      on:change={(e) => onExclude(e.target.checked)}
    />
  </label>
  <select
    bind:value={mappings[name]}
    class="w-full bg-gray-800 text-white border border-gray-600 rounded p-1 cursor-pointer appearance-none hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
    style="background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'white\' d=\'M7 10l5 5 5-5z\'/></svg>'); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 1rem; padding-right: 1.5rem;"
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
  .exclude-toggle {
    display: flex;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .exclude-toggle input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    margin: 0;
    cursor: pointer;
    appearance: none;
    background-color: #1a1a1a;
    border: 1px solid #666;
    border-radius: 3px;
  }

  .exclude-toggle input[type="checkbox"]:checked {
    background-color: #666;
    border-color: #888;
    position: relative;
  }

  .exclude-toggle input[type="checkbox"]:checked::after {
    content: 'x';
    position: absolute;
    color: #fff;
    font-size: 0.75rem;
    top: -1px;
    left: 2px;
  }
</style>
