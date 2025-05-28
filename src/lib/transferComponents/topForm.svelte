<script lang="ts">
let inputFocused = $state(false);
	import { onMount } from 'svelte';

	let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();
	let projectName = $state('');
	let data = $state<projects[]>([]);
	let filteredProjects = $state<projects[]>([]);

	type projects = {
		projectName: string;
		projectId: string;
	};

	let projectNameList = $state<projects[]>([]);

// Filtered suggestions based on input
// let filteredProjects = $derived(
//   projectNameList.filter(
//     (p) => projectName && p.projectName.toLowerCase().includes(projectName.toLowerCase())
//   )
// );

function selectSuggestion(name: string) {
  projectName = name;
}

	// Call the GET endpoint when the component mounts
	onMount(async () => {
		const res = await fetch('/api/topFormApi');
		data = (await res.json()) as projects[];
		console.log(data);
		projectNameList = data || [];
	});

	
	function handleSubmit(event: Event) {
		addProjectName(projectName);
	}
</script>

<form action="" onsubmit={handleSubmit}>
	<h1>Top Form</h1>

	<input
  type="text"
  bind:value={projectName}
  placeholder="Project Name"
  onfocus={() => inputFocused = true}
  onblur={() => inputFocused = false}
/>
<p>Debug: {JSON.stringify(projectNameList)}</p>
{#if (inputFocused || projectName.length > 0) && projectNameList.length > 0}
  <ul id="autocomplete-items-list">
    {#each projectNameList as project}
      <li>{project.projectName}</li>
    {/each}
  </ul>
{/if}
	<button type="submit">Submit</button>
</form>
