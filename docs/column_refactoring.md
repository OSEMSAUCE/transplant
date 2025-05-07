# Column Architecture Refactoring

## Current Progress (March 12, 2025)

We're implementing a Column-based architecture to solve several issues in the TransPlant application:

- Type inconsistency between Transform and TransPlant stages
- GPS coordinate precision problems
- Repeated validation code
- Loss of formatting information

### Completed Steps

1. ✓ **Core Type Definitions**

   - [x] Defined `ColumnDef` interface with shared properties
   - [x] Created type-specific interfaces (`StringColumn`, `NumberColumn`, `DateColumn`, `GpsColumn`)
   - [x] Added support for cell-level validation state
   - [x] Added type coercion tracking

2. ✓ **GPS Column Enhancements**

   - [x] Added support for GPS coordinate merging
   - [x] Implemented universal GPS column selection logic
   - [x] Created configuration for lat/lon pair handling

3. ✓ **Cell Validation System**

   - [x] Implemented cell-level validation state tracking
   - [x] Added logic for determining when cells are greyed out
   - [x] Created utility functions for updating validation states

4. ✓ **Documentation**
   - [x] Updated `table_instructions.md` with Column architecture details
   - [x] Updated `gps_docs.md` with GPS selection logic
   - [x] Created code annotation system for refactoring
   - [x] Documented migration strategy

### Files to Update

The following files will need to be modified to fully implement the Column architecture:

### Transform Components

1. **TransformManager.svelte** [MAJOR CHANGES]

   - [ ] Replace current column type handling with Column objects
   - [ ] Replace type detection with `detectColumnType` from columnUtils
   - [ ] Replace toggle functionality with `toggleColumn` from columnUtils
   - [ ] Replace `getValidatedData` to return Column-based format

2. **DataPreviewTable.svelte** [MODERATE CHANGES]

   - [ ] Replace column type props with Column objects
   - [ ] Replace cell rendering based on Column validation state

3. **GpsColumn.svelte** [MODERATE CHANGES]
   - [ ] Replace current GPS handling with GpsColumn functionality
   - [ ] Replace GPS detection with Column-based approach

### TransPlant Components

1. **transplantDataTable.svelte** [MAJOR CHANGES]

   - [ ] Replace current data handling with Column objects
   - [ ] Replace GPS handling with GpsColumn functionality
   - [ ] Add conversion from legacy format during transition (bridge)

2. **transplantDbTargetTable.svelte** [MODERATE CHANGES]
   - [ ] Replace column type mapping with Column objects
   - [ ] Replace type compatibility checks with Column-based validation

### Routes

1. **transform/+page.svelte** [MINOR CHANGES]

   - [ ] Replace ValidatedTransformData interface with ColumnBasedTransformData
   - [ ] Add conversion between formats during transition (bridge)

2. **transplant/+page.svelte** [MODERATE CHANGES]

   - [x] Replace data handling to use Column objects
   - [x] Add conversion from legacy format during transition (bridge)

3. **api/schema/+server.ts** [MINOR CHANGES]
   - [ ] Update schema handling to work with Column objects

## Migration Strategy

1. **Phase 1: Bridge Implementation**

   - [x] Define Column interfaces in columnTypes.ts
   - [x] Implement Column models in columnModel.ts
   - [x] Add core utility functions in columnUtils.ts
   - [x] Complete bridge functions in columnUtils.ts
   - [x] Add conversion in Transform/TransPlant handoff
   - [ ] Test with real data to ensure compatibility

2. **Phase 2: Transform Component Updates**

   - [ ] Update TransformManager.svelte to use Column objects internally
   - [ ] Continue using bridge functions for output
   - [ ] Update DataPreviewTable.svelte to work with Column objects

3. **Phase 3: TransPlant Component Updates**

   - [ ] Update transplantDataTable.svelte to accept Column objects
   - [ ] Continue supporting legacy format via bridge functions

4. **Phase 4: Complete Migration**
   - [ ] Remove bridge functions
   - [ ] Update all components to use Column objects directly
   - [ ] Clean up legacy code

## Next Steps

1. **Bridge Functions** ⬅️ _Current Focus_

   - [ ] Complete the conversion between legacy and Column-based formats
   - [ ] Test with real data from the Transform stage

2. **Transform/TransPlant Handoff**

   - [ ] Update the handoff to use the Column-based structure
   - [ ] Ensure proper type preservation

3. **UI Integration**

   - [ ] Update UI components to work with the Column architecture
   - [ ] Implement column toggling and type selection

4. **Migration Strategy**
   - [x] Create a gradual migration path for existing code
   - [x] Identify components to prioritize for migration

## Code Annotation System

To maintain clarity during the refactoring process, we'll use the following annotation tags in comments:

### Annotation Tags

- `// [DELETE]` - Legacy code that will be removed after migration
- `// [BRIDGE]` - Temporary compatibility functions that convert between old and new formats
- `// [NEW]` - New architecture code that will remain after migration
- `// [REPLACE: function_name]` - Code that will be replaced by a specific new function
- `// [INTENTION: description]` - Notes about future implementation plans

### Example

```typescript
// [DELETE] Old function for legacy format
function processGpsCoordinates(coords: string): string {
	// ...
}

// [BRIDGE] Converts between legacy and Column formats
function convertLegacyToColumnBased(data: LegacyData): ColumnData {
	// ...
}

// [NEW] Part of the new Column architecture
function updateCellValidationStates(column: Column): Column {
	// ...
}

// [REPLACE: toggleColumn] Will be replaced by toggleColumn in columnUtils.ts
function toggleColumnVisibility(columnName: string, visible: boolean): void {
	// ...
}

// [INTENTION: Create utility for GPS precision handling with 7 decimal places]
```

## Implementation Plan

This refactoring follows the plan to:

1. Start implementing the Column architecture directly
2. Focus on the Transform/TransPlant handoff
3. Create a clear migration path
4. Annotate all code to clarify migration intentions

The goal is to address both immediate issues (GPS precision, type safety) and long-term architecture improvements without disrupting the existing application.
