# Contributing to Transplant

This guide outlines key architectural decisions, state management patterns, and styling conventions for the Transplant project.

## State Management

### Data Pipeline States

Transplant uses a unified state management approach with three core states:

1. **CSV State**
   - Raw data from uploaded CSV files
   - Managed by `loadCsv()` function
   - Type: `CsvData`

2. **Transformed State**
   - Validated and cleaned data
   - Managed by `transform()` function
   - Type: `TransformedData`
   - Ensures data consistency and type safety

3. **Mapped State**
   - Data mapped to database schema
   - Managed by `mapColumns()` function
   - Type: `MappedData`
   - Ready for database operations

### State Management with Svelte 5 Runes

```typescript
// Primary States using $state
const csvData = $state<CsvData | null>(null);
const transformedData = $state<TransformedData | null>(null);
const mappedData = $state<MappedData | null>(null);

// Derived States using $derived
const isCsvLoaded = $derived(csvData !== null);
const isTransformed = $derived(transformedData !== null);
const isMapped = $derived(mappedData !== null);
```

### Critical Data Relationships

The Planted table represents actual planting events where:
1. `land_name` exists in the Land table
2. `crop_name` exists in the Crop table
3. The combination comes from imported data

Important considerations:
- Multiple plantings of same land-crop pair allowed
- 'planted' column required for valid planting
- Strict referential integrity maintained

## UI Styling Conventions

### Table and Form Layout

1. Column Widths
```css
:root {
  --column-width: 12.5rem; /* Standardized column width */
}
```

2. Table Structure
- Fixed-width columns with `width: auto`
- Use standardized `--column-width`
- No container width stretching
- Aligned dropdowns with columns

3. Measurements (REM-based)
- Font: `0.875rem` (14px)
- Padding: `0.25rem`, `0.5rem`, `1rem`
- Border radius: `0.25rem`
- Column width: `12.5rem`

### Form Elements

1. Dropdowns
```css
select {
  width: var(--column-width);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
```

2. Grid Layout
```css
.grid {
  grid-template-columns: repeat(n, minmax(12.5rem, 1fr));
  gap: 0;
}
```

## Best Practices

1. State Management
- Use `$state` for primary data
- Use `$derived` for computed values
- Keep state transitions clear and predictable
- Validate data at each state transition

2. Code Organization
- Group related state in single files
- Use consistent naming for state functions
- Document state transitions clearly
- Keep state logic separate from UI

3. Data Validation
- Validate at each state transition
- Maintain referential integrity
- Clear error handling and logging
- Type-safe state transformations

## Development Tools

1. TypeScript
- Use strict typing throughout
- Define interfaces for all states
- Leverage type inference when clear
- No `any` types without justification

2. Testing
- Test state transitions thoroughly
- Verify data validation rules
- Test derived state calculations
- Mock complex state transitions

