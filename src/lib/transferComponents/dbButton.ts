// src/lib/transferComponents/dbButton.ts
import { importedData } from './modelState.svelte';

export async function submitToDB(
	projectName?: string,
	organizationName?: string,
	projectNotes?: string
) {
	try {
		// HERE is where we can insert the project name, organization name, and project notes
		// And do validations
		if (!projectName) {
			console.error('No project name provided');
			return { success: false, error: 'No project name provided' };
		}

		if (!organizationName) {
			console.error('No organization name provided');
			return { success: false, error: 'No organization name provided' };
		}

		const columns = importedData.columns;

		if (!columns || columns.length === 0) {
			console.error('No data available to submit');
			return { success: false, error: 'No data available to submit' };
		}

		const mappedColumns = columns.filter((col) => col.isMapped && col.mappedTo);

		const landColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('land.'));
		const cropColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('crop.'));
		const plantingColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('planting.'));

		// Key debug: show what is mapped where
		console.log('landColumns:');
		landColumns.forEach((col) => console.log('  land col.mappedTo:', col.mappedTo));
		console.log('plantingColumns:');
		plantingColumns.forEach((col) => console.log('  planting col.mappedTo:', col.mappedTo));

		// Find the land_name and crop_name columns
		// Look for these columns in both the land/crop tables AND the planting table
		const landNameColumn = mappedColumns.find(
			(col) => col.mappedTo === 'land.landName' || col.mappedTo === 'planting.landName'
		);
		const cropNameColumn = mappedColumns.find(
			(col) => col.mappedTo === 'crop.cropName' || col.mappedTo === 'planting.cropName'
		);

		console.log('DEBUG: Found landNameColumn:', landNameColumn);
		console.log('DEBUG: Found cropNameColumn:', cropNameColumn);

		const landNames = new Set();
		const cropNames = new Set();

		if (landNameColumn) {
			landNameColumn.values.forEach((value) => {
				if (value) landNames.add(value);
			});
		}
		if (cropNameColumn) {
			cropNameColumn.values.forEach((value) => {
				if (value) cropNames.add(value);
			});
		}

		const land = Array.from(landNames).map((landName) => {
			const landEntry: Record<string, any> = { landName };
			// For any mapped land attribute (e.g., hectares, projectId, landHolder, etc.),
			// this loop will include it automatically if mapped in the UI.
			// No need to add explicit handling for each attribute!
			landColumns.forEach((col) => {
				if (col.mappedTo !== 'land.landName') {
					const fieldName = col.mappedTo?.replace('land.', '') || '';
					const rowIndex = landNameColumn?.values.findIndex(
						(value, idx) => value === landName && !landNameColumn.isGreyed[idx]
					);
					if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < col.values.length) {
						if (!col.isGreyed[rowIndex]) {
							landEntry[fieldName] = col.formattedValues[rowIndex] ?? col.values[rowIndex];
						}
					}
				}
			});
			return landEntry;
		});

		const crops = Array.from(cropNames).map((cropName) => {
			const cropEntry: Record<string, any> = { cropName };
			cropColumns.forEach((col) => {
				if (col.mappedTo !== 'crop.cropName') {
					const fieldName = col.mappedTo?.replace('crop.', '') || '';
					const rowIndex = cropNameColumn?.values.findIndex(
						(value, idx) => value === cropName && !cropNameColumn.isGreyed[idx]
					);
					if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < col.values.length) {
						if (!col.isGreyed[rowIndex]) {
							cropEntry[fieldName] = col.formattedValues[rowIndex] ?? col.values[rowIndex];
						}
					}
				}
			});
			return cropEntry;
		});

		const plantings: Record<string, any>[] = []; 
		if (landNameColumn && cropNameColumn) {
			for (let i = 0; i < landNameColumn.values.length; i++) {
				const landName = landNameColumn.values[i];
				const cropName = cropNameColumn.values[i];
				if (!landName || !cropName || landNameColumn.isGreyed[i] || cropNameColumn.isGreyed[i]) {
					continue;
				}
				const plantingEntry: Record<string, any> = { landName, cropName };
				plantingColumns.forEach((col) => {
					if (col.mappedTo !== 'planting.landName' && col.mappedTo !== 'planting.cropName') {
						const fieldName = col.mappedTo?.replace('planting.', '') || '';
						if (i < col.values.length && !col.isGreyed[i]) {
							plantingEntry[fieldName] = col.formattedValues[i] ?? col.values[i];
						}
					}
				});
				plantings.push(plantingEntry);
			}
		}

		const data = {
			projectName: projectName || 'TransPlant Import ' + new Date().toISOString().split('T')[0],
			organizationName: organizationName || '',
			projectNotes: projectNotes || 'Imported via TransPlant application',
			land,
			crops,
			plantings
		};
		console.log('Submitting data to Server:', data);

		const response = await fetch('/api/submitToDb', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Unknown error');
		console.log('Server submission result:', result);
		return { success: true, result };
	} catch (err) {
		console.error('Failed to submit to Server:', err);
		return { success: false, error: (err as Error).message };
	}
}
