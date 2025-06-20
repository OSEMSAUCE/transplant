# GPS Column Component Documentation

## Overview

The GpsColumn component processes and displays location data in the DataPreviewTable. It handles multiple GPS formats and provides address-based geocoding as a fallback.

## GPS Point Processing Workflow

### 1. Primary GPS Processing

- Processes active columns in order (respects toggleOff state)
- Takes first valid GPS point found
- Supports multiple formats:
  - Decimal Degrees (DD): "49.266446, -123.071453"
  - Degrees, Minutes, Seconds (DMS): "49°15'59.2"N 123°04'17.2"W"
  - Split lat/lon columns

### 2. Format Priority

1. Direct GPS Coordinates
   - Combined DD format
   - Split lat/lon columns
   - DMS format
2. Address Fallback (if no GPS found)
   - Specific addresses first (e.g., "225 West 8th Ave. Suite 300, Vancouver BC V5Y1N3")
   - General locations second (e.g., "Portland Oregon")

## Universal GPS Column Selection Logic

The Column-based architecture implements a specific selection strategy for determining the "best" GPS coordinates for each row. The selection process follows this priority order:

### Selection Priority

1. **Latitude and Longitude Pairs**

   - If both latitude and longitude columns are available and not toggled off, use the first pair found
   - Both columns must have valid values for the row
   - Values are converted to numbers and formatted with 7 decimal places precision

2. **Direct GPS Columns**

   - If lat/lon pairs are unavailable or toggled off, use direct GPS columns
   - Takes the first valid GPS column that isn't toggled off
   - Supports both DD and DMS formats, converting all to DD

3. **Fallback to Toggled-Off Columns**

   - If all active columns are invalid or empty for a row, fall back to toggled-off columns
   - This ensures we always get the best available GPS even if the user has toggled off the column

4. **Row-Level Fallback**
   - If a specific cell in a preferred column is greyed out or empty, try the next best option
   - This allows row-by-row selection of the best available GPS data

### Implementation Details

```typescript
export interface GpsSourceConfig {
	sourceColumns: string[]; // All columns that can provide GPS data
	latLonPairs?: Array<{
		// Pairs of latitude/longitude columns
		latColumn: string; // Latitude column name
		lonColumn: string; // Longitude column name
		priority?: number; // Priority of this pair (lower is higher priority)
	}>;
	gpsColumns?: string[]; // Direct GPS columns to consider
	selectionStrategy: GpsSelectionStrategy; // How to select the GPS data
	fallbackToToggledOff?: boolean; // Whether to use toggled-off columns as fallback
}
```

The `sourceTracking` property in the GpsColumn tracks which source provided each GPS value, making it easy to debug and understand the selection process.

### 3. Address Geocoding System

- Local caching for batch requests
- External API integration (e.g., Google Geocoding)
- Batch processing for efficiency

## Component Integration

```svelte
<GpsColumn row={rowData} columnHeaders={headers} toggledColumns={toggleState} />
```

## Display Format

- All coordinates displayed in DD format: "49.266446, -123.071453"
- Fixed width column (12.5rem)
- Overflow handling with ellipsis

## Future Enhancements

- [ ] Implement address geocoding fallback
- [ ] Add local caching system
- [ ] Add coordinate range validation
- [ ] Support additional GPS formats
