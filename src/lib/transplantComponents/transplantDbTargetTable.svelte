<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { transformedDataService } from '$lib/stores/transformStore';
	import { schemaService } from '$lib/services/schemaService';

	// Props from parent
	const { draggedColumn = null } = $props<{
		draggedColumn?: { header: string; columnType: string } | null;
	}>();

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Schema metadata state
	let schemaMetadata = $state<Record<string, any> | null>(null);
	let schemaRelationships = $state<Record<string, any> | null>(null);
	let schemaColumnTypes = $state<Record<string, Record<string, string>> | null>(null);
	let schemaTableHeaders = $state<Record<string, string[]> | null>(null);
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

		if (schemaColumnTypes) {
			Object.entries(schemaColumnTypes).forEach(([tableName, columns]) => {
				newCompatibleTargets[tableName] = [];

				Object.entries(columns).forEach(([fieldName, fieldType]) => {
					if (isTypeCompatible(columnType, fieldType)) {
						newCompatibleTargets[tableName].push(fieldName);
					}
				});
			});
		}

		// Set the state once after all calculations are done
		compatibleTargets = newCompatibleTargets;
	}

	onMount(async () => {
		console.log('TransplantDbTargetTable: Component mounted');

		try {
			// Subscribe to schema metadata
			const unsubscribeMetadata = schemaService.metadata.subscribe((metadata) => {
				schemaMetadata = metadata;
				if (metadata) {
					console.log('TransplantDbTargetTable: Schema metadata loaded');
				}
			});

			// Subscribe to schema relationships
			const unsubscribeRelationships = schemaService.relationships.subscribe((relationships) => {
				schemaRelationships = relationships;
				if (relationships) {
					console.log('TransplantDbTargetTable: Schema relationships loaded');
				}
			});

			// Subscribe to schema column types
			const unsubscribeColumnTypes = schemaService.columnTypes.subscribe((columnTypes) => {
				schemaColumnTypes = columnTypes;
				if (columnTypes) {
					console.log('TransplantDbTargetTable: Schema column types loaded');
					// Initialize table data with empty rows
					const tables = Object.keys(columnTypes);
					tableNames = tables;
					tables.forEach((table) => {
						if (!tableData[table]) {
							tableData[table] = Array(emptyRows).fill({});
						}
					});
				}
			});

			// Subscribe to schema table headers
			const unsubscribeTableHeaders = schemaService.tableHeaders.subscribe((tableHeaders) => {
				schemaTableHeaders = tableHeaders;
				if (tableHeaders) {
					console.log('TransplantDbTargetTable: Schema table headers loaded');
				}
			});

			// Subscribe to schema loading state
			const unsubscribeLoading = schemaService.isLoading.subscribe((loading) => {
				isSchemaLoading = loading;
				if (!loading) {
					console.log('TransplantDbTargetTable: Schema metadata loaded successfully');
				}
			});

			const unsubscribeError = schemaService.error.subscribe((error) => {
				schemaError = error;
				if (error) {
					console.error('TransplantDbTargetTable: Error loading schema metadata:', error);
				}
			});

			// Get data from transform service
			const transformedData = transformedDataService.get();
			if (transformedData) {
				transformData = transformedData;
				console.log('TransplantDbTargetTable: Loaded data from transform service:', transformData);
			} else {
				console.warn('TransplantDbTargetTable: No data available from transform service');
			}

			// Return cleanup function
			return () => {
				unsubscribeMetadata();
				unsubscribeRelationships();
				unsubscribeColumnTypes();
				unsubscribeTableHeaders();
				unsubscribeLoading();
				unsubscribeError();
			};
		} catch (error) {
			console.error('TransplantDbTargetTable: Error in onMount:', error);
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

		console.log(`Dropped ${csvColumn} onto ${table}.${field}`);

		// Get the type of the CSV column - either from draggedColumn prop or from transformData
		const csvColumnType =
			draggedColumn?.header === csvColumn
				? draggedColumn.columnType
				: transformData.columnTypes?.[csvColumn];

		// Get the type of the target database field
		const dbFieldType = schemaColumnTypes?.[table]?.[field];

		// Validate type compatibility
		if (!isTypeCompatible(csvColumnType, dbFieldType)) {
			console.error(`Type mismatch: Cannot map ${csvColumnType} to ${dbFieldType}`);
			// Show error message to user
			const errorMessage = `Type mismatch: Cannot map ${csvColumnType} (${csvColumn}) to ${dbFieldType} (${field})`;
			alert(errorMessage);
			return;
		}

		// FUNDAMENTAL RULE: A column can only be mapped to one field name
		if (columnFieldMap[csvColumn] && columnFieldMap[csvColumn] !== field) {
			// This column is already mapped to a different field name
			console.log(`Column ${csvColumn} is already mapped to field "${columnFieldMap[csvColumn]}"`);

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

		console.log(`Updating preview data for ${table}.${field} from ${csvColumn}`);

		// Create a copy of the current table data
		const updatedTableData = { ...tableData };

		// Initialize the table if it doesn't exist
		if (!updatedTableData[table]) {
			updatedTableData[table] = Array(emptyRows).fill({});
		}

		// Get the field type from schema
		const fieldType = schemaColumnTypes?.[table]?.[field];

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

		console.log(`Updated preview data for ${table}.${field}`);
	}

	// Propagate data to related tables if needed
	function propagateData(table: string, field: string, csvColumn: string) {
		// Implementation for data propagation between tables based on schema relationships
		if (!schemaRelationships || !transformData || !transformData.records || !schemaTableHeaders) {
			console.log(
				'Cannot propagate: missing schema relationships, transform data, or table headers'
			);
			return;
		}

		console.log(`Checking propagation for ${table}.${field}`);

		// Debug logging for state
		console.log('=== DEBUG HEADER RELATIONSHIPS ===');
		console.log('CSV Column:', csvColumn);

		// Log all tables that have this field name
		console.log(`Tables with field "${field}":`);
		Object.entries(schemaTableHeaders).forEach(([tableName, headers]) => {
			if (headers.includes(field)) {
				console.log(`- ${tableName}`);
			}
		});

		// Log all mappings for this column
		console.log(`All mappings for column "${csvColumn}":`);
		Object.entries(mappings).forEach(([col, target]) => {
			if (col === csvColumn) {
				const [mappedTable, mappedField] = target.split('.');
				console.log(`- Mapped to ${mappedTable}.${mappedField}`);
			}
		});

		// Log the field name this column is mapped to in columnFieldMap
		console.log(`Field name in columnFieldMap for "${csvColumn}":`, columnFieldMap[csvColumn]);

		// Log all columns mapped to this field name
		console.log(`All columns mapped to field "${field}":`);
		Object.entries(columnFieldMap).forEach(([col, fieldName]) => {
			if (fieldName === field) {
				console.log(`- ${col}`);
			}
		});

		console.log('=== END DEBUG ===');

		// Find all tables that have a field with the same name
		Object.entries(schemaTableHeaders).forEach(([targetTable, headers]) => {
			// Skip the source table
			if (targetTable === table) return;

			// Check if the target table has the same field name
			if (headers.includes(field)) {
				console.log(`Propagating ${field} from ${table} to ${targetTable} table`);
				console.log(`Target table ${targetTable} headers:`, headers);

				// Update the preview data in the target table
				updatePreviewData(targetTable, field, csvColumn);

				// Update mappings for the target table
				const updatedMappings = { ...mappings };
				updatedMappings[csvColumn] = `${targetTable}.${field}`;
				mappings = updatedMappings;

				console.log('AFTER PROPAGATION:');
				console.log(`Column ${csvColumn} is now mapped to:`, mappings[csvColumn]);
				console.log(`Column ${csvColumn} field in columnFieldMap:`, columnFieldMap[csvColumn]);

				// Note: We don't need to update columnFieldMap here because
				// the field name stays the same, just in a different table
			}
		});
	}

	// Helper functions for the UI
	function isFieldMapped(table: string, field: string): boolean {
		return Object.values(mappings).includes(`${table}.${field}`);
	}

	function getMappedColumn(table: string, field: string): string {
		const entry = Object.entries(mappings).find(([_, value]) => value === `${table}.${field}`);
		return entry ? entry[0] : '';
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
		<!-- Debug information -->
		<!-- <div class="debug-info">
			
			{#if Object.keys(mappings).length > 0}
				<p>Current mappings: {Object.keys(mappings).length}</p>
			{/if}
			{#if draggedColumn}
				<p>Dragging: {draggedColumn.header} (Type: {draggedColumn.columnType})</p>
			{/if}
		</div> -->

		{#each tableNames as tableName}
			<div class="table-section">
				<h4 class="table-title">{tableName}</h4>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								{#each schemaTableHeaders[tableName] || [] as header}
									<th
										class={`
											${isFieldMapped(tableName, header) ? 'mapped-field' : ''} 
											${dragOverField?.table === tableName && dragOverField?.field === header ? 'drag-over' : ''} 
											${draggedColumn && isCompatibleTarget(tableName, header) ? 'compatible-target' : ''} 
											${draggedColumn && !isCompatibleTarget(tableName, header) ? 'incompatible-target' : ''}
										`}
										ondragover={(e) => handleDragOver(e, tableName, header)}
										ondragleave={handleDragLeave}
										ondrop={(e) => handleDrop(e, tableName, header)}
									>
										<div class="header-controls">
											{#if isFieldMapped(tableName, header)}
												<span class="mapped-indicator">
													From: {getMappedColumn(tableName, header)}
												</span>
											{/if}
											<span
												class="type-pseudo-select"
												data-type={schemaColumnTypes[tableName]?.[header]}
											>
												{formatTypeName(schemaColumnTypes[tableName]?.[header] || '')}
											</span>
											<span class="header-text">{header}</span>
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each getTableData(tableName) as row, rowIndex}
								<tr>
									{#each schemaTableHeaders[tableName] || [] as header}
										<td
											class={`
												${isFieldMapped(tableName, header) ? 'mapped-cell' : ''} 
												${dragOverField?.table === tableName && dragOverField?.field === header ? 'drag-over' : ''} 
												${draggedColumn && isCompatibleTarget(tableName, header) ? 'compatible-target' : ''} 
												${draggedColumn && !isCompatibleTarget(tableName, header) ? 'incompatible-target' : ''}
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
