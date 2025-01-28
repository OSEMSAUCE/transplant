<script lang="ts">
	import RepositoryTable from '$lib/components/tablePackages/repositoryTable/repositoryTable.svelte';
	import type { Repository } from '@prisma/client';

	export let data: { repositories: Repository[] };
</script>

<h1>Forest Info</h1>

<RepositoryTable data={data.repositories} />
