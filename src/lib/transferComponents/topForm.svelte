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
	type ApiResponse = { projects: Project[]; organizations: Organization[] };
	type Project = { projectName: string; projectId: string };
	type Organization = { organizationName: string; organizationId: string };
	let inputFocusedProject = $state(false);

	// Generic autocomplete state
	let inputFocused = $state(false);

	// Project autocomplete state

	let { projectName, organizationName, projectNotes, source, updateProjectData } = $props<{
		projectName: string;
		organizationName: string;
		projectNotes: string;
		source?: string;
		updateProjectData?: (data: {
			projectName: string;
			organizationName: string;
			projectNotes: string;
			source?: string;
		}) => void;
	}>();

	// Create local bindings that will update the parent values
	let localProjectName = $state(projectName || '');
	let localOrgName = $state(organizationName || '');
	let localProjectNotes = $state(projectNotes || '');
	let localSource = $state(source || '');

	// Effect to propagate changes back to parent
	$effect(() => {
	console.log('Effect running in topForm with values:', {
		localProjectName,
		localOrgName,
		localProjectNotes,
		localSource
	});
	// Use the updateProjectData callback to update the parent component
	if (updateProjectData) {
		updateProjectData({
			projectName: localProjectName,
			organizationName: localOrgName,
			projectNotes: localProjectNotes,
			source: localSource
		});
		console.log('Called updateProjectData with:', {
			localProjectName,
			localOrgName,
			localProjectNotes,
			localSource
		});
	}
});

	let allProjects = $state<Project[]>([]);
	let filteredProjects = $state<Project[]>([]);
	let highlightedIndex = $state<number | null>(null);

	// Organization autocomplete state
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
		if (!localProjectName) {
			filteredProjects = [];
			highlightedIndex = null;
			return;
		}
		filteredProjects = allProjects.filter((p) =>
			p.projectName.toLowerCase().includes(localProjectName.toLowerCase())
		);
		highlightedIndex = filteredProjects.length > 0 ? 0 : null;
	}

	function filterOrganizations() {
		if (!localOrgName) {
			filteredOrganizations = [];
			organizationHighlighted = null;
			return;
		}
		filteredOrganizations = allOrganizations.filter((o) =>
			o.organizationName.toLowerCase().includes(localOrgName.toLowerCase())
		);
		organizationHighlighted = filteredOrganizations.length > 0 ? 0 : null;
	}

	function selectProjectSuggestion(name: string) {
		console.log('selectProjectSuggestion called with:', name);
		localProjectName = name;
		filteredProjects = [];
		inputFocused = false;
		console.log('localProjectName set to:', localProjectName);
	}

	function selectOrganizationSuggestion(name: string) {
		console.log('selectOrganizationSuggestion called with:', name);
		localOrgName = name;
		filteredOrganizations = [];
		inputFocused = false;
		console.log('localOrgName set to:', localOrgName);
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
			if (
				organizationHighlighted === null ||
				organizationHighlighted === filteredOrganizations.length - 1
			) {
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
				selectOrganizationSuggestion(
					filteredOrganizations[organizationHighlighted].organizationName
				);
				e.preventDefault();
			}
		} else if (e.key === 'Escape') {
			filteredOrganizations = [];
			organizationHighlighted = null;
		}
	}
</script>

<form action="" autocomplete="off">
	<h3>Top Form</h3>

	<div class="topform-row">
		<!-- Project Name Input with dropdown -->
		<div class="input-block">
			<input
				type="text"
				bind:value={localProjectName}
				placeholder="Project name *"
				oninput={filterProjects}
				onfocus={handleProjectFocus}
				onblur={handleProjectBlur}
				onkeydown={handleProjectKeydown}
				autocomplete="off"
				class="required-field"
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
				bind:value={localOrgName}
				placeholder="Organization name *"
				oninput={filterOrganizations}
				onfocus={handleOrganizationFocus}
				onblur={handleOrganizationBlur}
				onkeydown={handleOrganizationKeydown}
				autocomplete="off"
				class="required-field"
			/>
			{#if inputFocusedOrganization && filteredOrganizations.length > 0}
				<ul id="autocomplete-items-list" role="listbox">
					{#each filteredOrganizations as organization, i}
						<li
							role="option"
							placeholder="Organization name *"
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
				bind:value={localProjectNotes}
				placeholder="Project Notes"
				autocomplete="off"
			/>
		</div>
	</div>
	<!-- Source Input -->
	<div class="input-block">
		<input type="text" bind:value={localSource} placeholder="Source" autocomplete="off" />
	</div>
</form>
<!-- 
<style>
	/* Add this to custom-pico.scss if you want it to apply globally */
	.required-field::placeholder {
		color: inherit;
	}

	/* Use a pseudo-element to create the red asterisk effect */
	.required-field {
		position: relative;
	}

	.required-field::after {
		content: '*';
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: #e53935;
		font-weight: bold;
	}

	/* Other styles moved to src/lib/styles/custom-pico.scss */
</style> -->
