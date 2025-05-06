// src/lib/transferComponents/dbButton.ts
import { importedData } from './modelState.svelte';

export async function submitToDB() {
	try {
		// Get the current state of the imported data
		const columns = importedData.columns;

		if (!columns || columns.length === 0) {
			console.error('No data available to submit');
			return { success: false, error: 'No data available to submit' };
		}

		// Extract headers and prepare data structure
		const mappedColumns = columns.filter((col) => col.isMapped && col.mappedTo);

		// Organize data by table
		const landColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('land.'));
		const cropColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('crop.'));
		const plantingColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('planting.'));

		// Get unique land names and crop names to create separate entries
		const landNames = new Set();
		const cropNames = new Set();

		// Find the land_name and crop_name columns
		const landNameColumn = mappedColumns.find((col) => col.mappedTo === 'land.landName');
		const cropNameColumn = mappedColumns.find((col) => col.mappedTo === 'crop.cropName');

		if (landNameColumn) {
			landNameColumn.values.forEach((value) => {
				if (value && !landNameColumn.isGreyed[landNameColumn.values.indexOf(value)]) {
					landNames.add(value);
				}
			});
		}

		if (cropNameColumn) {
			cropNameColumn.values.forEach((value) => {
				if (value && !cropNameColumn.isGreyed[cropNameColumn.values.indexOf(value)]) {
					cropNames.add(value);
				}
			});
		}

		// Create land entries
		const land = Array.from(landNames).map((landName) => {
			const landEntry: Record<string, any> = { landName };

			landColumns.forEach((col) => {
				if (col.mappedTo !== 'land.landName') {
					const fieldName = col.mappedTo?.replace('land.', '') || '';

					// Find the first row where land_name matches and use that value
					const rowIndex = landNameColumn?.values.findIndex(
						(value, idx) => value === landName && !landNameColumn.isGreyed[idx]
					);

					if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < col.values.length) {
						// Only include the value if it's not greyed out
						if (!col.isGreyed[rowIndex]) {
							landEntry[fieldName] = col.formattedValues[rowIndex] ?? col.values[rowIndex];
						}
					}
				}
			});

			return landEntry;
		});

		// Create crop entries
		const crops = Array.from(cropNames).map((cropName) => {
			const cropEntry: Record<string, any> = { cropName };

			cropColumns.forEach((col) => {
				if (col.mappedTo !== 'crop.cropName') {
					const fieldName = col.mappedTo?.replace('crop.', '') || '';

					// Find the first row where crop_name matches and use that value
					const rowIndex = cropNameColumn?.values.findIndex(
						(value, idx) => value === cropName && !cropNameColumn.isGreyed[idx]
					);

					if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < col.values.length) {
						// Only include the value if it's not greyed out
						if (!col.isGreyed[rowIndex]) {
							cropEntry[fieldName] = col.formattedValues[rowIndex] ?? col.values[rowIndex];
						}
					}
				}
			});

			return cropEntry;
		});

		// Create planting entries (connecting land and crops)
		const plantings: Record<string, any>[] = [];

		// If we have both land_name and crop_name columns, we can create planting entries
		if (landNameColumn && cropNameColumn) {
			// For each row in the data
			for (let i = 0; i < landNameColumn.values.length; i++) {
				const landName = landNameColumn.values[i];
				const cropName = cropNameColumn.values[i];

				// Skip if either land_name or crop_name is greyed out or null
				if (!landName || !cropName || landNameColumn.isGreyed[i] || cropNameColumn.isGreyed[i]) {
					continue;
				}

				const plantingEntry: Record<string, any> = {
					landName,
					cropName
				};

				// Add other planting fields
				plantingColumns.forEach((col) => {
					if (col.mappedTo !== 'planting.landName' && col.mappedTo !== 'planting.cropName') {
						const fieldName = col.mappedTo?.replace('planting.', '') || '';

						// Only include the value if it's not greyed out
						if (i < col.values.length && !col.isGreyed[i]) {
							plantingEntry[fieldName] = col.formattedValues[i] ?? col.values[i];
						}
					}
				});

				plantings.push(plantingEntry);
			}
		}

		// Debug information
		console.log('landNames:', Array.from(landNames));
		console.log('cropNames:', Array.from(cropNames));
		console.log('landNameColumn:', landNameColumn ? 'exists' : 'undefined');
		console.log('cropNameColumn:', cropNameColumn ? 'exists' : 'undefined');
		console.log('landColumns length:', landColumns.length);
		console.log('cropColumns length:', cropColumns.length);
		console.log('plantingColumns length:', plantingColumns.length);

		// Create the final data structure
		const data = {
			projectName: 'TransPlant Import ' + new Date().toISOString().split('T')[0],
			projectNotes: 'Imported via TransPlant application',
			land,
			crops,
			plantings
		};

		console.log('Submitting data to DB:', data);

		// Send the data to the API endpoint
		const response = await fetch('/api/submitToDB', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		const result = await response.json();
		if (!response.ok) {
			throw new Error(result.error || 'Unknown error');
		}

		console.log('DB submission result:', result);
		return { success: true, result };
	} catch (err) {
		console.error('Failed to submit to DB:', err);
		return { success: false, error: (err as Error).message };
	}
}
