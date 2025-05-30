<script lang="ts">
	import { onMount } from 'svelte';
	// Debounce helper (inside main script)
	function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => fn(...args), delay);
		};
	}

	// Existing project name logic

	type Project = { projectName: string; projectId: string };
	type ApiResponse = { projects: Project[], organizations: Organization[] };
	type Organization = { organizationName: string; organizationId: string };

	let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();
	let projectName = $state('');
	let allProjects = $state<Project[]>([]);
	let filteredProjects = $state<Project[]>([]);
	let inputFocused = $state(false);
	let highlightedIndex = $state<number | null>(null);

	// Organization autocomplete state	
	let organizationInput = $state('');
	let organizationName = $state('');
	let allOrganizations = $state<Organization[]>([]);
	let filteredOrganizations = $state<Organization[]>([]);
	let organizationSuggestions = $state<string[]>([]);
	let organizationLoading = $state(false);
	let organizationFocused = $state(false);
	let organizationHighlighted = $state<number | null>(null);

	// Fetch all projects on mount
	onMount(async () => {
		const res = await fetch('/api/topFormApi');
		const data = (await res.json()) as ApiResponse;
		allProjects = data.projects || [];
		filteredProjects = [];
		allOrganizations = data.organizations || [];
		filteredOrganizations = [];
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
	}

	function handleFocus() {
		inputFocused = true;
		filterProjects();
	}

	// --- Organization Autocomplete Logic ---
	const fetchOrganizationSuggestions = debounce(async () => {
		if (organizationInput.length < 2) {
			organizationSuggestions = [];
			organizationLoading = false;
			return;
		}
		organizationLoading = true;
		try {
			// Replace this URL with your real endpoint
			const res = await fetch(`/api/organizations?search=${encodeURIComponent(organizationInput)}`);
			if (res.ok) {
				const data = await res.json();
				organizationSuggestions = data.organizations || [];
			} else {
				organizationSuggestions = [];
			}
		} catch (err) {
			organizationSuggestions = [];
		}
		organizationLoading = false;
	}, 300);

	function onOrganizationInput() {
		organizationHighlighted = null;
		fetchOrganizationSuggestions();
	}

	function selectOrganization(org: string) {
		organizationInput = org;
		organizationSuggestions = [];
		organizationFocused = false;
	}

	function createNewOrganization(org: string) {
		// TODO: Implement creation logic or emit event
		organizationInput = org;
		organizationSuggestions = [];
		organizationFocused = false;
	}

	function handleBlur() {
		// Delay to allow click event on suggestion
		setTimeout(() => {
			inputFocused = false;
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

	<!-- Project Name Input with dropdown -->
	<div style="position: relative;">
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
			<ul id="autocomplete-items-list" role="listbox">
				{#each filteredProjects as project, i}
					<li
						role="option"
						onmousedown={() => selectSuggestion(project.projectName)}
						class:selected={i === highlightedIndex}
						style="cursor:pointer"
					>
						{project.projectName}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Organization Input with dropdown -->
	<div style="position: relative;">
		<input
			type="text"
			bind:value={organizationName}
			placeholder="Organization Name"
			oninput={filterProjects}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
			autocomplete="off"
		/>
		{#if inputFocused && filteredOrganizations.length > 0}
			<ul id="autocomplete-items-list" role="listbox">
				{#each filteredOrganizations as organization, i}
					<li
						role="option"
						onmousedown={() => selectOrganization(organization.organizationName)}
						class:selected={i === organizationHighlighted}
						style="cursor:pointer"
					>
						{organization.organizationName}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Organization Input
	<div style="margin-top: 1.5rem; position: relative;">
		<label for="stakeholder-input">Organizations</label>
		<input
			id="stakeholder-input"
			type="text"
			bind:value={stakeholderInput}
			placeholder="Organization Name"
			oninput={onStakeholderInput}
			onfocus={() => (stakeholderFocused = true)}
			onblur={() => setTimeout(() => (stakeholderFocused = false), 200)}
			autocomplete="off"
		/>
		{#if stakeholderFocused && stakeholderInput.length >= 2}
			<ul id="stakeholder-autocomplete-list" role="listbox">
				{#if stakeholderLoading}
					<li style="color: #888;">Searching...</li>
				{:else if stakeholderSuggestions.length > 0}
					{#each stakeholderSuggestions as org, i}
						<li
							role="option"
							class:selected={i === stakeholderHighlighted}
							onmousedown={() => selectStakeholder(org)}
							style="cursor:pointer"
						>
							{org}
						</li>
					{/each}
				{:else}
					<li style="color: #888;">
						No results found. <span
							role="button"
							tabindex="0"
							style="cursor:pointer; color:#2196f3;"
							onmousedown={() => createNewStakeholder(stakeholderInput)}
							><b>Create new organization: "{stakeholderInput}"</b></span
						>
					</li>
				{/if}
			</ul>
		{/if}
	</div> -->
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
		border: 1px solid #2196f355;
		border-radius: 0.25rem;
		min-width: 200px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	:global(#autocomplete-items-list li),
	:global(#autocomplete-items-list li.selected),
	:global(#autocomplete-items-list li:hover) {
		background: transparent !important;
	}

	:global(#autocomplete-items-list li.selected) {
		background-color: #21f35625 !important;
		color: #2196f3 !important;
		border: 2px solid #21f35655;
		border-radius: 0.25rem;
		font-weight: bold;
	}

	:global(#autocomplete-items-list li:hover) {
		background: #6b7980 !important;
	}
	:global(#stakeholder-autocomplete-list) {
		--pico-background-color: #a7c0cc44 !important;
		background: #a7c0cc55 !important;
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		border: 1px solid #2196f355;
		border-radius: 0.25rem;
		min-width: 200px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		position: absolute;
		z-index: 10;
	}
	:global(#stakeholder-autocomplete-list li),
	:global(#stakeholder-autocomplete-list li.selected),
	:global(#stakeholder-autocomplete-list li:hover) {
		background: transparent !important;
	}
	:global(#stakeholder-autocomplete-list li.selected) {
		background-color: #2196f355 !important;
		color: #2196f3 !important;
		border: 2px solid #2196f355;
		border-radius: 0.25rem;
		font-weight: bold;
	}
	:global(#stakeholder-autocomplete-list li:hover) {
		background: #6b7980 !important;
	}
</style>
