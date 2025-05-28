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
					style="cursor:pointer; background: {i === highlightedIndex ? '#eee' : 'transparent'}"
				>
					{project.projectName}
				</li>
			{/each}
		</ul>
	{/if}

	<button type="submit">Submit</button>
</form>

<style>
	.selected {
		background: #eee;
		font-weight: bold;
	}
</style>
