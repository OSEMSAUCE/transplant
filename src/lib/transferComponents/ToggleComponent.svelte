<script lang="ts">
	const { columnHeader, onToggle } = $props<{
		columnHeader: string; // Changed from columnId
		onToggle: (columnHeader: string, isActive: boolean) => void;
	}>();

	// const x:string =
	let isActive = $state(true);

	function handleToggle() {
		isActive = !isActive;
		onToggle(columnHeader, isActive);
	}
</script>

<div class="column-toggle">
	<input type="checkbox" checked={isActive} onchange={handleToggle} />
</div>
