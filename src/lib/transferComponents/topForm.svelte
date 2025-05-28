<script lang="ts">
	import { onMount } from 'svelte';

	type Project = { projectName: string; projectId: string };
	type ProjectsResponse = { projects: Project[] };

	let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();
	let projectName = $state('');
	let allProjects = $state<Project[]>([]);
	let filteredProjects = $state<Project[]>([]);
	let inputFocused = $state(false);
	let highlightedIndex = $state<number | null>(null);

	// Fetch all projects on mount
	onMount(async () => {
		const res = await fetch('/api/topFormApi');
		const data = (await res.json()) as ProjectsResponse;
		allProjects = data.projects || [];
		filteredProjects = [];
	});

	// Filter projects as you type
	function filterProjects() {
		if (!projectName) {
			filteredProjects = [];
			highlightedIndex = null;
			return;
		}
		filteredProjects = allProjects.filter((p) =>
			p.projectName.toLowerCase().includes(projectName.toLowerCase())
		);
		highlightedIndex = filteredProjects.length > 0 ? 0 : null;
	}

	function selectSuggestion(name: string) {
		projectName = name;
		filteredProjects = [];
		inputFocused = false;
		highlightedIndex = null;
	}

	function handleFocus() {
		inputFocused = true;
		filterProjects();
	}

	function handleBlur() {
		// Delay to allow click event on suggestion
		setTimeout(() => {
			inputFocused = false;
			filteredProjects = [];
			highlightedIndex = null;
		}, 100);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!filteredProjects.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (highlightedIndex === null || highlightedIndex === filteredProjects.length - 1) {
				highlightedIndex = 0;
			} else {
				highlightedIndex!++;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (highlightedIndex === null || highlightedIndex === 0) {
				highlightedIndex = filteredProjects.length - 1;
			} else {
				highlightedIndex!--;
			}
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			if (highlightedIndex !== null && filteredProjects[highlightedIndex]) {
				selectSuggestion(filteredProjects[highlightedIndex].projectName);
				e.preventDefault();
			}
		} else if (e.key === 'Escape') {
			filteredProjects = [];
			highlightedIndex = null;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		addProjectName?.(projectName);
		filteredProjects = [];
	}
</script>

<form action="" onsubmit={handleSubmit} autocomplete="off">
	<h1>Top Form</h1>
	<input
		type="text"
		bind:value={projectName}
		placeholder="Project Name"
		oninput={filterProjects}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		autocomplete="off"
	/>

	{#if inputFocused && filteredProjects.length > 0}
		<ul id="autocomplete-items-list">
			{#each filteredProjects as project, i}
				<li
					onmousedown={() => selectSuggestion(project.projectName)}
					class:selected={i === highlightedIndex}
					style="cursor:pointer"
				>
					{project.projectName}
				</li>
			{/each}
		</ul>
	{/if}

	<button type="submit">Submit</button>
</form>

<style>
    :global(#autocomplete-items-list) {
      /* Override Pico's variable and fallback background */
      --pico-background-color: #a7c0cc44 !important;
      background: #a7c0cc55 !important;
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid #2196f3;
      border-radius: 0.25rem;
      min-width: 200px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    :global(#autocomplete-items-list li),
    :global(#autocomplete-items-list li.selected),
    :global(#autocomplete-items-list li:hover) {
      background: transparent !important;
    }
    
    :global(#autocomplete-items-list li.selected) {
      background-color: #2196f3 !important;
      color: white !important;
      border: 2px solid #2196f3;
      border-radius: 0.25rem;
      font-weight: bold;
    }
    
    :global(#autocomplete-items-list li:hover) {
      background: #a7c0cc !important;
    }
    </style>