<script lang="ts">
	let projectName: string = '';
	let { addProjectName } = $props<{ addProjectName?: (projectName: string) => void }>();
    
    // API HERE!!!!  @+server.ts#L1-9 


    
    // pull from database the project names - Best to do this from the parent. 
    // Remove submit button and tie it to Send to TransPlant button
    // make transplant button grey out until requred filled out.
    // red outline of top Form for required
    // make organization input and give it lookup from projectName
    // make project auto complete? dropdown etc from projects
    // deal with auto genarated projects name submitted through Retreever.
    // 
    // next feature, is  auto complete? dropdown etc/
// 
	function handleSubmit(event: Event) {
		addProjectName(projectName);
	}
</script>

<form action="" onsubmit={handleSubmit}>
	<h1>Top Form</h1>

	<input type="text" bind:value={projectName} placeholder="Project Name" />
	<button type="submit">Submit</button>
</form>RU
