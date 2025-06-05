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
	type ApiResponse = { projects: Project[], organizations: Organization[] };
	type Project = { projectName: string; projectId: string };
	type Organization = { organizationName: string; organizationId: string };
	
	// Generic autocomplete state
	let inputFocused = $state(false);
	
	// Project autocomplete state	
	let { addProjectName } = $props<{ addProjectName?: (projectName: string, projectNotes?: string) => void }>();
	let projectName = $state('');
	let projectNotes = $state('');
	let allProjects = $state<Project[]>([]);
	let filteredProjects = $state<Project[]>([]);
	let highlightedIndex = $state<number | null>(null);
	let inputFocusedProject = $state(false);

	// Organization autocomplete state	
	let organizationName = $state('');
	let allOrganizations = $state<Organization[]>([]);
	let filteredOrganizations = $state<Organization[]>([]);
	let organizationHighlighted = $state<number | null>(null);
	let inputFocusedOrganization = $state(false);
	
	// FIX THIS 30 May 2025 
	// NOT generic OrgnaisationName , allOrganizations, filteredOrganizations, 
	// GENERIC organizationHighlighted, inputFocusedOrganization
	//
	
	

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

	function filterOrganizations() {
		if (!organizationName) {
			filteredOrganizations = [];
			organizationHighlighted = null;
			return;
		}
		filteredOrganizations = allOrganizations.filter((o) =>
			o.organizationName.toLowerCase().includes(organizationName.toLowerCase())
		);
		organizationHighlighted = filteredOrganizations.length > 0 ? 0 : null;
	}

	function selectProjectSuggestion(name: string) {
		projectName = name;
		filteredProjects = [];
		inputFocused = false;
	}

	function selectOrganizationSuggestion(name: string) {
		organizationName = name;
		filteredOrganizations = [];
		inputFocused = false;
	}

	function handleProjectFocus() {
		inputFocusedProject = true;
		filterProjects();
	}

	function handleOrganizationFocus() {
		inputFocusedOrganization = true;
		filterOrganizations();
	}

	function handleProjectBlur() {
		// Delay to allow click event on suggestion
		setTimeout(() => {
			inputFocusedProject = false;
			highlightedIndex = null;
		}, 100);
	}

	function handleOrganizationBlur() {
		// Delay to allow click event on suggestion
		setTimeout(() => {
			inputFocusedOrganization = false;
			organizationHighlighted = null;
		}, 100);
	}


	function handleProjectKeydown(e: KeyboardEvent) {
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
				selectProjectSuggestion(filteredProjects[highlightedIndex].projectName);
				e.preventDefault();
			}
		} else if (e.key === 'Escape') {
			filteredProjects = [];
			highlightedIndex = null;
		}
	}

	function handleOrganizationKeydown(e: KeyboardEvent) {
		if (!filteredOrganizations.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (organizationHighlighted === null || organizationHighlighted === filteredOrganizations.length - 1) {
				organizationHighlighted = 0;
			} else {
				organizationHighlighted!++;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (organizationHighlighted === null || organizationHighlighted === 0) {
				organizationHighlighted = filteredOrganizations.length - 1;
			} else {
				organizationHighlighted!--;
			}
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			if (organizationHighlighted !== null && filteredOrganizations[organizationHighlighted]) {
				selectOrganizationSuggestion(filteredOrganizations[organizationHighlighted].organizationName);
				e.preventDefault();
			}
		} else if (e.key === 'Escape') {
			filteredOrganizations = [];
			organizationHighlighted = null;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		addProjectName?.(projectName, projectNotes);
		filteredProjects = [];
	}
</script>

<form action="" onsubmit={handleSubmit} autocomplete="off">
	<h3>Top Form</h3>

	<div class="topform-row">
		<!-- Project Name Input with dropdown -->
		<div class="input-block">
		  <input
			type="text"
			bind:value={projectName}
			placeholder="Project Name"
			oninput={filterProjects}
			onfocus={handleProjectFocus}
			onblur={handleProjectBlur}
			onkeydown={handleProjectKeydown}
			autocomplete="off"
		  />
		  {#if inputFocusedProject && filteredProjects.length > 0}
			<ul id="autocomplete-items-list" role="listbox">
			  {#each filteredProjects as project, i}
				<li
				  role="option"
				  onmousedown={() => selectProjectSuggestion(project.projectName)}
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
		<div class="input-block">
		  <input
			type="text"
			bind:value={organizationName}
			placeholder="Organization Name"
			oninput={filterOrganizations}
			onfocus={handleOrganizationFocus}
			onblur={handleOrganizationBlur}
			onkeydown={handleOrganizationKeydown}
			autocomplete="off"
		  />
		  {#if inputFocusedOrganization && filteredOrganizations.length > 0}
			<ul id="autocomplete-items-list" role="listbox">
			  {#each filteredOrganizations as organization, i}
				<li
				  role="option"
				  onmousedown={() => selectOrganizationSuggestion(organization.organizationName)}
				  class:selected={i === organizationHighlighted}
				  style="cursor:pointer"
				>
				  {organization.organizationName}
				</li>
			  {/each}
			</ul>
		  {/if}
		</div>
		<!-- Project Notes Input -->
		<div class="input-block">
		  <input
			type="text"
			bind:value={projectNotes}
			placeholder="Project Notes"
			autocomplete="off"
			style="min-width: 200px;"
		  />
		</div>
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
