# Contributing to Transplant

This guide outlines key architectural decisions, data relationships, and styling conventions for the Transplant project.

## Data Architecture

### Critical Relationship: Land-Crop-Planted Tables

The Planted table represents actual planting events from the imported data.
Each row in the Planted table must correspond to a real planting event where:
1. `land_name` exists in the Land table
2. `crop_name` exists in the Crop table
3. The combination of `land_name` and `crop_name` must come from the imported data

Important considerations:
- Multiple plantings of the same land-crop combination are possible (e.g., different dates)
- The 'planted' column (number of trees) is the minimum required data to confirm a planting occurred
- Planted table rows are derived from actual import data, not all possible combinations
- Each `land_name` must validate against Land table
- Each `crop_name` must validate against Crop table

## UI Styling Conventions

### Table and Form Layout

1. Column Widths
```css
:root {
  --column-width: 12.5rem; /* Standardized column width */
}
```

2. Table Structure
- Use fixed-width columns with `width: auto` on tables
- Each column should use the standardized `--column-width`
- Tables should not stretch to container width
- Dropdowns should align perfectly with their corresponding columns

3. Measurements
- Use REMs for all measurements for better accessibility:
  - Font sizes: `0.875rem` (14px equivalent)
  - Padding: `0.25rem` (4px), `0.5rem` (8px), `1rem` (16px)
  - Border radius: `0.25rem` (4px)
  - Column width: `12.5rem` (200px)

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

1. Accessibility
- Use REM units for all measurements to respect user font size preferences
- Maintain consistent spacing and sizing across components
- Ensure proper color contrast for text and interactive elements

2. Code Organization
- Keep related styles together using CSS variables
- Use consistent naming conventions for classes and variables
- Document any deviations from these standards with clear reasoning

3. Data Validation
- Always validate data relationships before saving
- Ensure imported data maintains referential integrity
- Log validation errors clearly for debugging

## Using Windsurf Editor

1. Memories
- Use the Memory system to store important context about code organization and conventions
- Tag memories appropriately for easy retrieval
- Update memories when architectural decisions change

2. Documentation
- Keep this CONTRIBUTING.md file updated with new patterns and decisions
- Use inline documentation for complex logic
- Reference this guide in code comments when implementing patterns
