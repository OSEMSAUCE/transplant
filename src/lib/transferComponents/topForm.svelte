<script lang="ts">
    import { onMount } from 'svelte';
  
    type Project = { projectName: string; projectId: string };
    type ProjectsResponse = { projects: Project[] };
  
    let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();
    let projectName = $state('');
    let allProjects = $state<Project[]>([]);
    let filteredProjects = $state<Project[]>([]);
    let inputFocused = $state(false);
  
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
        return;
      }
      filteredProjects = allProjects.filter((p) =>
        p.projectName.toLowerCase().includes(projectName.toLowerCase())
      );
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
  
    function handleBlur() {
      // Delay to allow click event on suggestion
      setTimeout(() => {
        inputFocused = false;
        filteredProjects = [];
      }, 100);
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
      autocomplete="off"
    />
  
    {#if inputFocused && filteredProjects.length > 0}
      <ul id="autocomplete-items-list">
        {#each filteredProjects as project}
          <li
            onmousedown={() => selectSuggestion(project.projectName)}
            style="cursor:pointer"
          >
            {project.projectName}
          </li>
        {/each}
      </ul>
    {/if}
  
    <button type="submit">Submit</button>
  </form>