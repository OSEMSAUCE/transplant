# Table Implementation Instructions

## Overview

This document provides guidance on implementing a dynamic table for managing multi-stage data processing within the Transplant App.

## Column-Based Architecture (Added March 2025)

### The Problem

The TransPlant application has been facing several challenges with data handling between the Transform and TransPlant stages:

1. **Type Inconsistency**: Data types (especially GPS coordinates and numbers) are not consistently preserved between stages
2. **Separated Data Structure**: Column names, types, and values are stored in separate objects, requiring constant lookups and re-validation
3. **Format Loss**: Formatting information is lost when data is passed between components
4. **Excessive Validation**: The same validation code appears in multiple places

### The Solution: Column as a Fundamental Building Block

We are implementing a Column-based architecture where each column is treated as a cohesive entity that binds together:

1. The column name/header (importedColumnName)
2. The column type (string, number, date, GPS)
3. The actual data values
4. Formatting information
5. Validation rules
6. UI state (toggled, mapped, etc.)

### Implementation

```typescript
// Core Column interface
interface Column {
	name: string; // The header/importedColumnName
	type: 'string' | 'number' | 'date' | 'gps'; // Base data type
	values: (string | number | null)[]; // The actual data for this column
	isToggled: boolean; // Whether this column is toggled on/off
	isRequired?: boolean; // Whether this field is required
	isMapped?: boolean; // Whether this field is mapped
	mappedTo?: string; // What it's mapped to
	format?: {
		// Formatting information
		precision?: number; // For numbers/GPS
		dateFormat?: string; // For dates
		gpsFormat?: 'DMS' | 'DD'; // For GPS coordinates
	};
	validation?: {
		// Validation rules
		min?: number;
		max?: number;
		pattern?: string;
	};

	// Type coercion tracking
	selectTypeCoercion?: {
		isCoerced: boolean; // Whether the column type was manually changed
		originalType: string; // The original detected type
		coercedTo: string; // The type it was coerced to
	};

	// Cell-level validation state
	cellValidation?: Array<{
		// Validation state for individual cells
		rowIndex: number; // Row index in the column
		isValid: boolean; // Whether the cell is valid for the column type
		isGreyedOut: boolean; // Whether the cell is greyed out (invalid and ignored)
		failedSelectDetection: boolean; // Whether type detection failed for this cell
		originalValue: any; // The original value before processing
	}>;
}

// Type-specific column interfaces
interface GpsColumn extends ColumnDef {
	type: 'gps';
	values: (GpsCoordinate | null)[];
}

// Example GpsCoordinate type
type GpsCoordinate = {
	latitude: number;
	longitude: number;
	format?: 'DMS' | 'DD';
	precision?: number;
};
```

### Benefits

- **Reduced Validation**: Type information stays with the data, eliminating repeated validation
- **Type Safety**: TypeScript ensures correct handling of different data types
- **Consistent Formatting**: Format information is preserved throughout the application
- **Clearer Code**: Relationships between column properties are explicit
- **Easier Maintenance**: Changes to column handling can be made in one place

### Cell Validation and Type Coercion

The Column architecture includes sophisticated handling of cell-level validation and type coercion:

#### Cell Validation State

Individual cells within a column can have different validation states:

1. **Failed Type Detection**

   - When a cell's value doesn't match the column's detected type
   - Example: A column of numbers with one cell containing "NA"
   - These cells are marked with `failedSelectDetection: true`

2. **Greyed Out Cells**

   - Cells are greyed out when they fail type detection OR the column is toggled off (or both)
   - These cells are visually greyed out in the UI and ignored during the TransPlant process
   - This is a core state property that determines whether a cell's data is used in processing

3. **Validation Flow**
   - When a column is initially detected as a certain type (e.g., "number"):
     - Cells that don't match this type are marked `failedSelectDetection: true` and `isGreyedOut: true`
   - If the user toggles off a column:
     - All cells in that column will be greyed out regardless of their validation status
   - If the user changes the column type (e.g., to "string"):
     - Previously invalid cells may become valid
     - Their state changes to `failedSelectDetection: false` and `isGreyedOut: false`

#### Type Coercion

The Column architecture tracks when users manually change a column's type:

1. **Type Coercion Tracking**

   - `isCoerced: boolean` - Indicates the user changed the type
   - `originalType: string` - The type originally detected
   - `coercedTo: string` - The type the user selected

2. **Use Cases**

   - Date/Number Ambiguity: Years between 1850-2040 might be detected as dates but the user may want them as numbers
   - Special Values: Columns with mixed types that should be treated as strings
   - Formatting Control: Preventing automatic formatting of certain data

3. **Implementation**
   - When a user changes a column's type, the `selectTypeCoercion` object is populated
   - This affects how validation and formatting are applied
   - All cells are re-evaluated against the new type

### File Structure

The implementation adds these new files:

- `/src/lib/types/columnTypes.ts`: Core Column interface definitions
- `/src/lib/types/columnModel.ts`: Implementation of Column interface
- `/src/lib/utils/columnUtils.ts`: Utility functions for working with Columns

### Migration Strategy

The transition to this architecture will be gradual:

1. Define the Column interfaces and utilities
2. Create bridge functions to convert between old and new formats
3. Update the Transform/TransPlant handoff to use the Column approach
4. Gradually refactor components to use the Column concept

This approach ensures no breaking changes while improving the architecture.

## Table Structure

1. **Headers**:

   - Each header represents a different stage in the data pipeline: `csv`, `transformed`, and `mapped`.
   - Additional controls are included for toggling irrelevant attributes, sorting, and filtering columns.

2. **Components Above Headers**:

   - Dropdowns and toggles allow users to transform data types, sort columns, and map them to the database schema.

3. **Dynamic Table**:
   - The table updates dynamically based on user interactions before data is pushed to the database.

## Implementation Steps

### 1. Define Table Headers

- **CSV Header**: Displays raw CSV headers.
- **Transformed Header**: Displays headers post-transformation.
- **Mapped Header**: Displays headers mapped to the database schema.

### 2. Create Components Above Headers

- **Dropdowns**: Enable selection of data types and transformation options.
- **Toggles**: Allow users to enable/disable features and sorting.

### 3. State Management

- Use `$state` and `$derived` runes to track current data processing stage.
- Implement functions like `loadCsv`, `transform`, and `mapColumns` for transitioning between stages.

### 4. UI Integration

- Implement the table in Svelte, ensuring it dynamically updates based on state.
- Connect UI elements to state from `data.ts` to maintain responsiveness.

## Organizing Table and Headers

### Approach 1: Single Route File with Header Components

**Structure:**

- A single route file (`+page.svelte`) manages the overall page.
- Separate components for each header type in `src/lib/components`.

**Pros:**

- **Modularity**: Headers are independent, making updates easier.
- **Reusability**: Components can be reused across different tables/pages.
- **Simplified Routing**: A single route file reduces complexity.

**Cons:**

- **Component Overhead**: Multiple small components may introduce complexity.
- **Inter-Component Communication**: State flow between the page and components needs careful handling.

### Approach 2: Separate Files for Each Table/Header Combo

**Structure:**

- Each table/header combination is defined in its own file.

**Pros:**

- **Isolation**: Reduces dependencies between components.
- **Customization**: Each table can have tailored logic.

**Cons:**

- **Duplication**: Similar logic may be repeated across files.
- **Maintenance**: Managing many files can become cumbersome.

### Approach 3: Table as a Component with Routes for Each Header

**Structure:**

- A shared table component, with separate routes for headers.

**Pros:**

- **Separation of Concerns**: Distinct separation of table logic and headers.
- **Dynamic Routing**: Supports conditional header rendering.

**Cons:**

- **Complex Routing**: Requires robust routing logic.
- **State Management**: Shared state handling between routes and components can be challenging.

### Recommended Approach

**Approach 1** (Single Route with Header Components) is recommended for its balance between modularity and simplicity. This structure ensures:

- Clear separation of concerns.
- Easier state management.
- Enhanced reusability.

## Reducing Complexity with Components

### Best Practices:

1. **Componentization**:

   - Separate headers and tables into modular components.
   - Keep UI logic separate from business logic.

2. **Three Headers per Route**:

   - Implement each header as its own component.
   - Maintain a direct relationship between headers and the table, avoiding deep nesting.

3. **Separation of Concerns**:

   - Move data processing logic to utility functions.
   - UI components should focus on rendering and interaction.

4. **Centralized State Management**:
   - Use a unified state management approach to minimize redundant state variables.

## Additional Considerations

- Implement error handling and validation to ensure data integrity.
- Keep UI intuitive and responsive for a better user experience.
- Allow users to interactively adjust and map columns before data is stored.

By following these strategies, the table implementation will be modular, efficient, and maintainable, aligning with the goals of the Transplant App.
