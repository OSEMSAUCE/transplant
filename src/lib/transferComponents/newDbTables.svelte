<script lang="ts">
	const { landUserTable, plantingUserTable, cropUserTable, dbFormat } = $props<{
		landUserTable: any[];
		plantingUserTable: any[];
		cropUserTable: any[];
		dbFormat: 'string' | 'number' | 'date' | 'gps';
	}>();
	const landColumns = Object.keys(landUserTable[0] || {});
	const plantingColumns = Object.keys(plantingUserTable[0] || {});
	const cropColumns = Object.keys(cropUserTable[0] || {});

	// 🌲️🌲️🌳️🌳️🌴️ DRAG DROP THING 🌲️🌲️🌳️🌳️🌴️
	// write a function to say when a user clicks a cell, figure out what column it's in.
	// we need columns to be one unit that's draggable 
	// change the visual representation of the column
	// user drags column data to a db table.
	// when they drop data on the db table it needs to:
	     // in state it populate on that attribute on the db table.
		 // in the view it must also populate on that attribute on the db table.
	// we need stat to update on "mapping" property
	// It also need to be normalized trees and land dont repeat
	// 	for planting table it needs to keep the relationship between land and tree(crop)


	function dragoverHandler(ev: DragEvent) {
		ev.preventDefault();
	}

	function dropHandler(ev: DragEvent) {
		if (!ev.dataTransfer || !ev.target) return;
		ev.preventDefault();
		const data = ev.dataTransfer.getData('text');
		(ev.target as HTMLElement).appendChild(document.getElementById(data) as HTMLElement);
	}


</script>

<h1 style="color: red;">{dbFormat}</h1>
<h3>Planting Table</h3>
<table>
	<thead>
		<tr>
			{#each plantingColumns as column, index}
				<th data-header-name={column} data-column-index={index} ondragover={dragoverHandler} ondrop={dropHandler}>{column}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		<tr>
			{#each plantingColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each plantingColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each plantingColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
	</tbody>
</table>

<h3>Land Table</h3>
<table>
	<thead>
		<tr>
			{#each landColumns as column, index}
				<th data-header-name={column} data-column-index={index}>{column}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		<!-- {#each landUserTable as column} -->
		<tr>
			{#each landColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each landColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each landColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<!-- {/each} -->
	</tbody>
</table>

<h3>Crop Table</h3>
<table>
	<thead>
		<tr>
			{#each cropColumns as column, index}
				<th data-header-name={column} data-column-index={index}>{column}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		<tr>
			{#each cropColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each cropColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
		<tr>
			{#each cropColumns as column, index}
				<td data-header-name={column} data-column-index={index}></td>
			{/each}
		</tr>
	</tbody>
</table>
