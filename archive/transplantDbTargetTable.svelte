<!-- <script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { transformedDataService } from '$lib/stores/transformStore';

	// Props from parent
	const { draggedColumn = null } = $props<{
		draggedColumn?: { header: string; columnType: string } | null;
	}>();

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Schema metadata state
	let schemaMetadata = $state<Record<string, any> | null>(null);
	let schemaRelationships = $state<Record<string, any> | null>(null);

	// Define schema table structure
	interface SchemaTable {
		headers: string[];
		columnTypes: Record<string, string>;
		requiredFields: string[];
	}

	// Combined schema data structure
	let schemaData = $state<Record<string, SchemaTable> | null>(null);
	let isSchemaLoading = $state<boolean>(true);
	let schemaError = $state<string | null>(null);

	// Table data state
	let tableNames = $state<string[]>([]);
	let tableData = $state<Record<string, any[]>>({});
	const emptyRows = 4;
	let mappings = $state<Record<string, string>>({});
	let dragOverField = $state<{ table: string; field: string } | null>(null);
	let columnFieldMap = $state<Record<string, string>>({});

	// Compatible targets for the currently dragged column
	let compatibleTargets = $state<Record<string, string[]>>({});

	// Get data from the transform service
	let transformData = $state<any>(null);

	// Track last processed column type to prevent infinite loop
	let lastProcessedColumnType = $state<string | null>(null);

	// Add these state variables for the mapping display
	let showMappingState = $state(false);
	let currentMappings = $state([]);
	let mappingsByTableName = $state({});

	// Watch for changes to draggedColumn prop
	$effect(() => {
		if (draggedColumn && draggedColumn.columnType !== lastProcessedColumnType) {
			// Only update compatible targets if the column type has changed
			lastProcessedColumnType = draggedColumn.columnType;
			updateCompatibleTargets(draggedColumn.columnType);
		} else if (!draggedColumn) {
			// Clear compatible targets when not dragging
			lastProcessedColumnType = null;
			compatibleTargets = {};
		}
	});

	// Function to update compatible targets based on column type
	function updateCompatibleTargets(columnType: string) {
		const newCompatibleTargets: Record<string, string[]> = {};

		if (schemaData) {
			Object.entries(schemaData).forEach(([tableName, tableData]) => {
				newCompatibleTargets[tableName] = [];

				if (tableData && tableData.columnTypes) {
					Object.entries(tableData.columnTypes).forEach(([fieldName, fieldType]) => {
						if (isTypeCompatible(columnType, fieldType)) {
							newCompatibleTargets[tableName].push(fieldName);
						}
					});
				}
			});
		}

		compatibleTargets = newCompatibleTargets;
	}

	onMount(async () => {
		try {
			// Subscribe to schema metadata
			const unsubscribeMetadata = schemaService.metadata.subscribe((metadata) => {
				schemaMetadata = metadata;
			});

			// Subscribe to schema relationships
			const unsubscribeRelationships = schemaService.relationships.subscribe((relationships) => {
				schemaRelationships = relationships;
			});

			// Subscribe to schema data
			const unsubscribeSchemaData = schemaService.schemaData.subscribe((data) => {
				if (data) {
					schemaData = data;
					Object.entries(data).forEach(([table, tableData]) => {
						if (tableData.requiredFields && tableData.requiredFields.length > 0) {
							console.log(`Table ${table} has required fields:`, tableData.requiredFields);
						}
					});

					// Initialize table data with empty rows
					const tables = Object.keys(data);
					tableNames = tables;
					const newTableData = { ...tableData };
					tables.forEach((table) => {
						if (!newTableData[table]) {
							newTableData[table] = Array(emptyRows).fill({});
						}
					});
					tableData = newTableData;
				}
			});

			// Subscribe to schema loading state
			const unsubscribeLoading = schemaService.isLoading.subscribe((loading) => {
				isSchemaLoading = loading;
			});

			const unsubscribeError = schemaService.error.subscribe((error) => {
				schemaError = error;
				if (error) {
					console.error('Error loading schema metadata:', error);
				}
			});

			// Get data from transform service
			const transformedData = transformedDataService.get();
			if (transformedData) {
				transformData = transformedData;
			} else {
				console.warn('No data available from transform service');
			}

			// Return cleanup function
			return () => {
				unsubscribeMetadata();
				unsubscribeRelationships();
				unsubscribeSchemaData();
				unsubscribeLoading();
				unsubscribeError();
			};
		} catch (error) {
			console.error('Error in onMount:', error);
			schemaError = error.message || 'Unknown error loading schema metadata';
		}
	});

	// Utility functions
	function isTypeCompatible(sourceType: string, targetType: string): boolean {
		if (!sourceType || !targetType) return false;

		// Normalize types to lowercase for comparison
		const source = sourceType.toLowerCase();
		const target = targetType.toLowerCase();

		// Direct matches
		if (source === target) return true;

		// Special case handling
		switch (source) {
			case 'string':
				// Strings can be mapped to text, varchar, etc.
				return ['text', 'varchar', 'char', 'string'].includes(target);
			case 'number':
				// Numbers can be mapped to numeric types
				return ['int', 'integer', 'decimal', 'numeric', 'float', 'double', 'number'].includes(
					target
				);
			case 'date':
				// Dates can be mapped to date/time types
				return ['date', 'datetime', 'timestamp'].includes(target);
			case 'gps':
				// GPS can be mapped to point or geography types
				return ['point', 'geography', 'geometry', 'gps'].includes(target);
			case 'latitude':
				// Latitude can be mapped to numeric or specific lat types
				return ['float', 'double', 'decimal', 'numeric', 'latitude'].includes(target);
			case 'longitude':
				// Longitude can be mapped to numeric or specific long types
				return ['float', 'double', 'decimal', 'numeric', 'longitude'].includes(target);
			default:
				return false;
		}
	}

	// Drag and drop handlers
	function handleDragOver(event: DragEvent, table: string, field: string) {
		event.preventDefault();

		// Check if this is a compatible target
		const isCompatible = draggedColumn && compatibleTargets[table]?.includes(field);

		if (!isCompatible) {
			event.dataTransfer!.dropEffect = 'none';
			return;
		}

		event.dataTransfer!.dropEffect = 'move';
		dragOverField = { table, field };
	}

	function handleDragLeave() {
		dragOverField = null;
	}

	function handleDrop(event: DragEvent, table: string, field: string) {
		event.preventDefault();
		dragOverField = null;

		const csvColumn = event.dataTransfer?.getData('text/plain');
		if (!csvColumn || !transformData) return;

		console.log(`MAPPING: "${csvColumn}" → ${table}.${field}`);

		// Get the type of the CSV column - either from draggedColumn prop or from transformData
		const csvColumnType =
			draggedColumn?.header === csvColumn
				? draggedColumn.columnType
				: transformData.columnTypes?.[csvColumn];

		// Get the type of the target database field
		const dbFieldType = schemaData?.[table]?.columnTypes?.[field];

		// Validate type compatibility
		if (!isTypeCompatible(csvColumnType, dbFieldType)) {
			console.error(
				`TYPE MISMATCH: Cannot map ${csvColumnType} (${csvColumn}) to ${dbFieldType} (${field})`
			);
			// Show error message to user
			const errorMessage = `Type mismatch: Cannot map ${csvColumnType} (${csvColumn}) to ${dbFieldType} (${field})`;
			alert(errorMessage);
			return;
		}

		// FUNDAMENTAL RULE: A column can only be mapped to one field name
		if (columnFieldMap[csvColumn] && columnFieldMap[csvColumn] !== field) {
			// This column is already mapped to a different field name
			console.warn(
				`CONFLICT: Column "${csvColumn}" is already mapped to field "${columnFieldMap[csvColumn]}"`
			);

			// Alert the user and prevent the mapping
			alert(
				`Column "${csvColumn}" is already mapped to field "${columnFieldMap[csvColumn]}". A column can only be mapped to one field name at a time.`
			);
			return; // Stop the operation here - don't proceed with mapping or propagation
		}

		// Create a copy of the current mappings
		const updatedMappings = { ...mappings };

		// Clear any existing mappings to this target field in this table
		Object.entries(updatedMappings).forEach(([col, mapping]) => {
			if (mapping === `${table}.${field}`) {
				delete updatedMappings[col];
			}
		});

		// Create new mapping
		updatedMappings[csvColumn] = `${table}.${field}`;
		mappings = updatedMappings;

		// Update our column to field mapping tracker
		columnFieldMap = { ...columnFieldMap, [csvColumn]: field };

		// Update the preview data
		updatePreviewData(table, field, csvColumn);

		// Propagate data if needed
		propagateData(table, field, csvColumn);

		// Dispatch event to notify parent component
		dispatch('mappingCreated', {
			csvColumn,
			tableName: table,
			fieldName: field,
			mappedColumns: Object.keys(mappings) // Send list of all mapped columns
		});
	}

	// Update preview data based on mappings
	function updatePreviewData(table: string, field: string, csvColumn: string) {
		if (!transformData || !transformData.records) return;

		// Create a copy of the current table data
		const updatedTableData = { ...tableData };

		// Initialize the table if it doesn't exist
		if (!updatedTableData[table]) {
			updatedTableData[table] = Array(emptyRows).fill({});
		}

		// Get the field type from schema
		const fieldType = schemaData?.[table]?.columnTypes?.[field];

		// Update the field in each row with the corresponding CSV data
		updatedTableData[table] = updatedTableData[table].map((row, index) => {
			if (index < transformData.records.length) {
				let value = transformData.records[index][csvColumn];

				// Handle type conversion based on the target field type
				if (fieldType && value !== undefined && value !== null) {
					if (
						fieldType.includes('numeric') ||
						fieldType.includes('int') ||
						fieldType.includes('float') ||
						fieldType.includes('double')
					) {
						// Convert string to number for numeric fields
						const numValue = Number(value);
						if (!isNaN(numValue)) {
							value = numValue;
						} else {
							console.warn(`Failed to convert "${value}" to number for ${table}.${field}`);
						}
					} else if (fieldType.includes('date') || fieldType.includes('timestamp')) {
						// Handle date conversion if needed
						try {
							const dateValue = new Date(value);
							if (!isNaN(dateValue.getTime())) {
								value = dateValue.toISOString();
							}
						} catch (error) {
							console.warn(`Failed to convert "${value}" to date for ${table}.${field}`);
						}
					}
				}

				return {
					...row,
					[field]: value
				};
			}
			return row;
		});

		// Update the tableData state
		tableData = updatedTableData;
	}

	// Propagate data to related tables if needed
	function propagateData(table: string, field: string, csvColumn: string) {
		// Implementation for data propagation between tables based on schema relationships
		if (!schemaRelationships || !transformData || !transformData.records || !schemaData) {
			console.warn(
				'Cannot propagate: missing schema relationships, transform data, or schema data'
			);
			return;
		}

		// Find all tables that have a field with the same name
		Object.entries(schemaData).forEach(([targetTable, tableData]) => {
			// Skip the source table
			if (targetTable === table) return;

			// Check if the target table has the same field name
			if (tableData && tableData.headers && tableData.headers.includes(field)) {
				console.log(`PROPAGATION: "${csvColumn}" → ${targetTable}.${field} (from ${table})`);

				// Update the preview data in the target table
				updatePreviewData(targetTable, field, csvColumn);

				// Update mappings for the target table
				const updatedMappings = { ...mappings };
				updatedMappings[csvColumn] = `${targetTable}.${field}`;
				mappings = updatedMappings;

				// Note: We don't need to update columnFieldMap here because
				// the field name stays the same, just in a different table
			}
		});
	}

	// Helper function to check if a field is required
	function isFieldRequired(table: string, field: string): boolean {
		// Use the schemaService directly to avoid reactivity issues
		return schemaService.isFieldRequired(table, field);
	}

	// Helper functions for the UI
	function isFieldMapped(table: string, field: string): boolean {
		// Direct mapping check - field is mapped in its own table
		const isDirectlyMapped = Object.values(mappings).includes(`${table}.${field}`);

		if (isDirectlyMapped) {
			return true;
		}

		// Handle natural keys from related tables
		if (table === 'Planting') {
			// For crop_name in Planting table, check if it's mapped in the Crop table
			if (field === 'crop_name') {
				return Object.values(mappings).includes('Crop.crop_name');
			}

			// For land_name in Planting table, check if it's mapped in the Land table
			if (field === 'land_name') {
				return Object.values(mappings).includes('Land.land_name');
			}
		}

		return false;
	}

	function getMappedColumn(table: string, field: string): string {
		// Direct mapping check
		const entry = Object.entries(mappings).find(([_, value]) => value === `${table}.${field}`);
		if (entry) return entry[0];

		// Handle special case for Planting table
		if (table === 'Planting') {
			// For crop_name in Planting table, check if it's mapped in the Crop table
			if (field === 'crop_name') {
				const cropEntry = Object.entries(mappings).find(([_, value]) => value === 'Crop.crop_name');
				return cropEntry ? cropEntry[0] : '';
			}

			// For land_name in Planting table, check if it's mapped in the Land table
			if (field === 'land_name') {
				const landEntry = Object.entries(mappings).find(([_, value]) => value === 'Land.land_name');
				return landEntry ? landEntry[0] : '';
			}
		}

		return '';
	}

	// Helper function to determine CSS class for required fields
	function getRequiredFieldClass(table: string, field: string): string {
		if (!isFieldRequired(table, field)) return '';

		const mappedClass = isFieldMapped(table, field) ? 'required-mapped' : 'required-unmapped';
		console.log(`Applied required field class for ${table}.${field}: ${mappedClass}`);

		return mappedClass;
	}

	function formatTypeName(typeName: string): string {
		// Format the type name for display
		if (!typeName) return 'Unknown';
		return typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();
	}

	function getTableData(tableName: string): any[] {
		return tableData[tableName] || Array(emptyRows).fill({});
	}

	// Function to check if a field is a compatible target for the currently dragged column
	function isCompatibleTarget(table: string, field: string): boolean {
		return compatibleTargets[table]?.includes(field) || false;
	}
</script>

{#if isSchemaLoading}
	<div class="loading-indicator">
		<p>Loading schema metadata...</p>
	</div>
{:else if schemaError}
	<div class="error-message">
		<p>Error loading schema: {schemaError}</p>
	</div>
{:else}
	<div class="database-tables-container">
		{#each tableNames as tableName}
			<div class="table-section">
				<h4 class="table-title">{tableName}</h4>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								{#each schemaData[tableName].headers as header}
									<th
										class={`
											${isFieldMapped(tableName, header) ? 'mapped-field' : ''} 
											${tableName === 'Planting' && isFieldMapped(tableName, header) ? 'planting-mapped-attribute' : ''}
											${dragOverField?.table === tableName && dragOverField?.field === header ? 'drag-over' : ''} 
											${draggedColumn && isCompatibleTarget(tableName, header) ? 'compatible-target' : ''} 
											${draggedColumn && !isCompatibleTarget(tableName, header) ? 'incompatible-target' : ''}
											${isFieldRequired(tableName, header) ? 'required-field' : ''}
										`}
										ondragover={(e) => handleDragOver(e, tableName, header)}
										ondragleave={handleDragLeave}
										ondrop={(e) => handleDrop(e, tableName, header)}
									>
										<div class="header-controls">
											{#if isFieldMapped(tableName, header)}
												<span class="mapped-indicator">
													{getMappedColumn(tableName, header)}
												</span>
											{/if}
											<span
												class="type-pseudo-select"
												data-type={schemaData[tableName].columnTypes[header]}
											>
												{formatTypeName(schemaData[tableName].columnTypes[header] || '')}
											</span>
											<span class={getRequiredFieldClass(tableName, header)}>
												{header}{isFieldRequired(tableName, header) ? ' *' : ''}
											</span>
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each getTableData(tableName) as row, rowIndex}
								<tr>
									{#each schemaData[tableName].headers as header}
										<td
											class={`
												${isFieldMapped(tableName, header) ? 'mapped-cell' : ''} 
												${tableName === 'Planting' && isFieldMapped(tableName, header) ? 'planting-mapped-attribute' : ''}
												${dragOverField?.table === tableName && dragOverField?.field === header ? 'drag-over' : ''} 
												${draggedColumn && isCompatibleTarget(tableName, header) ? 'compatible-target' : ''} 
												${draggedColumn && !isCompatibleTarget(tableName, header) ? 'incompatible-target' : ''}
												${isFieldRequired(tableName, header) ? 'required-field' : ''}
											`}
											ondragover={(e) => handleDragOver(e, tableName, header)}
											ondragleave={handleDragLeave}
											ondrop={(e) => handleDrop(e, tableName, header)}
										>
											{row[header] !== undefined ? row[header] : ''}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	</div>
{/if}


<style>
	.debug-state-panel {
		margin-top: 20px;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: #f8f9fa;
		font-family: monospace;
	}

	.debug-state-panel h4 {
		margin-top: 0;
		margin-bottom: 10px;
		font-size: 16px;
	}

	.debug-state-panel h5 {
		margin-top: 10px;
		margin-bottom: 5px;
		font-size: 14px;
	}

	.state-section {
		margin-bottom: 15px;
	}

	.debug-state-panel pre {
		background-color: #f1f1f1;
		padding: 8px;
		border-radius: 4px;
		overflow-x: auto;
		max-height: 200px;
		overflow-y: auto;
		margin: 0;
	}

	.mapped-indicator {
		font-size: 0.8rem;
		color: #4caf50;
		background-color: rgba(76, 175, 80, 0.1);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		display: inline-block;
		margin-bottom: 0.25rem;
	}

	span.required-mapped {
		border-left: 2px solid rgba(76, 175, 80, 0.8);
		padding-left: 4px;
		color: #4caf50;
	}

	span.required-unmapped {
		border-left: 2px solid rgba(255, 82, 82, 0.8);
		padding-left: 4px;
		color: #ff5252;
	}

	span.required-mapped::after {
		content: ' *';
		font-weight: bold;
		color: #4caf50; /* Green color for mapped fields */
	}

	.planting-mapped-attribute {
		opacity: 0.5;
	}
</style> -->
