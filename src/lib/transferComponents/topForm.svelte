<script lang="ts">
	let projectName: string = '';
	let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();

	function handleSubmit(event: Event) {
		addProjectName(projectName);
	}
</script>

<form action="" onsubmit={handleSubmit}>
	<h1>Top Form</h1>

	<input type="text" bind:value={projectName} placeholder="Project Name" />
	<button type="submit">Submit</button>
</form>
