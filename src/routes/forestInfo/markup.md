<script lang="ts">
    import { writable } from 'svelte/store'
    **import type { ComponentType } from 'svelte'**
    import {
      createSvelteTable,
      flexRender,
      getCoreRowModel,
    } from '@tanstack/svelte-table'
    **import type { ColumnDef, TableOptions } from '@tanstack/svelte-table'**

    function safeFlexRender(component: any, props: any): **_ComponentType_** {
      const rendered = flexRender(component, props);
      if (rendered === null) {
        return (() => '') as unknown as **_ComponentType_**;
      }
      return rendered;
    }


    **type Person = {**
      **_firstName: string_**
      **_lastName: string_**
      **_age: number_**
      **_visits: number_**
      **_status: string_**
      **_progress: number_**
    **}**

    const defaultData: **_Person[]_** = [
      {
        **_firstName: 'tanner',_**
        **_lastName: 'linsley',_**
        **_age: 24,_**
        **_visits: 100,_**
        **_status: 'In Relationship',_**
        **_progress: 50,_**
      },
      {
        **_firstName: 'tandy',_**
        **_lastName: 'miller',_**
        **_age: 40,_**
        **_visits: 40,_**
        **_status: 'Single',_**
        **_progress: 80,_**
      },
      {
        **_firstName: 'joe',_**
        **_lastName: 'dirte',_**
        **_age: 45,_**
        **_visits: 20,_**
        **_status: 'Complicated',_**
        **_progress: 10,_**
      },
    ]

    const defaultColumns: **_ColumnDef<Person>[]_** = [
      {
        accessorKey: 'firstName',
        cell: info => info.getValue(),
        footer: info => info.column.id,
      },
      {
        accessorFn: row => row.lastName,
        id: 'lastName',
        cell: info => info.getValue(),
        header: () => 'Last Name',
        footer: info => info.column.id,
      },
      {
        accessorKey: 'age',
        header: () => 'Age',
        // footer: info => info.column.id,
      },
      {
        accessorKey: 'visits',
        header: () => 'Visits',
        footer: info => info.column.id,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        footer: info => info.column.id,
      },
      {
        accessorKey: 'progress',
        header: 'Profile Progress',
        footer: info => info.column.id,
      },
    ]

    const options = writable<**_TableOptions<Person>_**>({
      data: defaultData,
      columns: defaultColumns,
      getCoreRowModel: getCoreRowModel(),
    })

    const rerender = () => {
      options.update(options => ({
        ...options,
        data: defaultData,
      }))
    }

    const table = createSvelteTable(options)
</script>
