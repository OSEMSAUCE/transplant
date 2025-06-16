<script lang="ts">
	import { onMount } from 'svelte';

	type Project = { projectName: string; projectId: string };
	type Organization = { organizationName: string; organizationId: string };
	type ApiResponse = { projects: Project[]; organizations: Organization[] };

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

	let localProjectName = $state(projectName || '');
	let localOrgName = $state(organizationName || '');
	let localProjectNotes = $state(projectNotes || '');
	let localSource = $state(source || '');

	let allProjects = $state<Project[]>([]);
	let filteredProjects = $state<Project[]>([]);
	let highlightedIndex = $state<number | null>(null);
	let inputFocusedProject = $state(false);

	let allOrganizations = $state<Organization[]>([]);
	let filteredOrganizations = $state<Organization[]>([]);
	let organizationHighlighted = $state<number | null>(null);
	let inputFocusedOrganization = $state(false);

	let sourceError = $state('');

	onMount(async () => {
		const res = await fetch('/api/topFormApi');
		const data = (await res.json()) as ApiResponse;
		allProjects = data.projects || [];
		allOrganizations = data.organizations || [];
	});

	function filterProjects(val = localProjectName) {
		filteredProjects = val
			? allProjects.filter((p) => p.projectName.toLowerCase().includes(val.toLowerCase()))
			: [];
		highlightedIndex = filteredProjects.length ? 0 : null;
	}

	function filterOrganizations(val = localOrgName) {
		filteredOrganizations = val
			? allOrganizations.filter((o) => o.organizationName.toLowerCase().includes(val.toLowerCase()))
			: [];
		organizationHighlighted = filteredOrganizations.length ? 0 : null;
	}

	function selectProjectSuggestion(name: string) {
		localProjectName = name;
		filteredProjects = [];
		inputFocusedProject = false;
		updateProjectData?.({
			projectName: name,
			organizationName: localOrgName,
			projectNotes: localProjectNotes,
			source: localSource
		});
	}

	function selectOrganizationSuggestion(name: string) {
		localOrgName = name;
		filteredOrganizations = [];
		inputFocusedOrganization = false;
		updateProjectData?.({
			projectName: localProjectName,
			organizationName: name,
			projectNotes: localProjectNotes,
			source: localSource
		});
	}

	$effect(() => {
		if (localSource && !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(localSource)) {
			sourceError = 'Please enter a valid URL (starting with http:// or https://)';
		} else {
			sourceError = '';
		}
	});
</script>

<form autocomplete="off">
	<div class="topform-row">
		<!-- Project Name Input -->
		<div class="input-block">
			<input
				type="text"
				bind:value={localProjectName}
				placeholder="Project name *"
				oninput={(e) => {
					const val = e.target.value;
					filterProjects(val);
					updateProjectData?.({
						projectName: val,
						organizationName: localOrgName,
						projectNotes: localProjectNotes,
						source: localSource
					});
				}}
				onfocus={() => {
					inputFocusedProject = true;
					filterProjects();
				}}
				onblur={() =>
					setTimeout(() => {
						inputFocusedProject = false;
						highlightedIndex = null;
					}, 100)}
				onkeydown={(e) => {
					if (!filteredProjects.length) return;
					if (e.key === 'ArrowDown')
						highlightedIndex =
							highlightedIndex === null || highlightedIndex === filteredProjects.length - 1
								? 0
								: highlightedIndex + 1;
					else if (e.key === 'ArrowUp')
						highlightedIndex =
							highlightedIndex === null || highlightedIndex === 0
								? filteredProjects.length - 1
								: highlightedIndex - 1;
					else if (e.key === 'Enter' || e.key === 'Tab') {
						if (highlightedIndex !== null && filteredProjects[highlightedIndex]) {
							selectProjectSuggestion(filteredProjects[highlightedIndex].projectName);
							e.preventDefault();
						}
					} else if (e.key === 'Escape') {
						filteredProjects = [];
						highlightedIndex = null;
					}
				}}
				autocomplete="off"
				class="required-field"
			/>
			{#if inputFocusedProject && filteredProjects.length}
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

		<!-- Organization Name Input -->
		<div class="input-block">
			<input
				type="text"
				bind:value={localOrgName}
				placeholder="Organization name *"
				oninput={(e) => {
					const val = e.target.value;
					filterOrganizations(val);
					updateProjectData?.({
						projectName: localProjectName,
						organizationName: val,
						projectNotes: localProjectNotes,
						source: localSource
					});
				}}
				onfocus={() => {
					inputFocusedOrganization = true;
					filterOrganizations();
				}}
				onblur={() =>
					setTimeout(() => {
						inputFocusedOrganization = false;
						organizationHighlighted = null;
					}, 100)}
				onkeydown={(e) => {
					if (!filteredOrganizations.length) return;
					if (e.key === 'ArrowDown')
						organizationHighlighted =
							organizationHighlighted === null ||
							organizationHighlighted === filteredOrganizations.length - 1
								? 0
								: organizationHighlighted + 1;
					else if (e.key === 'ArrowUp')
						organizationHighlighted =
							organizationHighlighted === null || organizationHighlighted === 0
								? filteredOrganizations.length - 1
								: organizationHighlighted - 1;
					else if (e.key === 'Enter' || e.key === 'Tab') {
						if (
							organizationHighlighted !== null &&
							filteredOrganizations[organizationHighlighted]
						) {
							selectOrganizationSuggestion(
								filteredOrganizations[organizationHighlighted].organizationName
							);
							e.preventDefault();
						}
					} else if (e.key === 'Escape') {
						filteredOrganizations = [];
						organizationHighlighted = null;
					}
				}}
				autocomplete="off"
				class="required-field"
			/>
			{#if inputFocusedOrganization && filteredOrganizations.length}
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
				bind:value={localProjectNotes}
				placeholder="Project Notes"
				oninput={(e) =>
					updateProjectData?.({
						projectName: localProjectName,
						organizationName: localOrgName,
						projectNotes: e.target.value,
						source: localSource
					})}
				autocomplete="off"
			/>
		</div>

		<!-- Source Input -->
		<div class="input-block">
			<input
				type="url"
				bind:value={localSource}
				placeholder="Source (URL)"
				oninput={(e) =>
					updateProjectData?.({
						projectName: localProjectName,
						organizationName: localOrgName,
						projectNotes: localProjectNotes,
						source: e.target.value
					})}
				autocomplete="off"
			/>
			{#if sourceError}
				<div class="error">{sourceError}</div>
			{/if}
		</div>
	</div>
</form>
