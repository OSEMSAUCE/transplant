/**
 * Simple duplicate pattern detection logic
 * Identifies different patterns of duplicates based on the first 10 rows
 * This allows highlighting different types of duplicates with different colors
 */

// Types for duplicate patterns
export type DuplicatePattern =
	| 'none'
	| 'landDuplicatePattern'
	| 'cropDuplicatePattern'
	| 'randomDuplicatePattern';

import type { ColumnRep } from '$lib/types/columnModel';

// Track pattern signatures we've seen
const patternSignatures: string[] = [];

/**
 * Populate isDuplicate and pattern masks for an array of columns (first 10 columns only)
 * @param columns Array of columns (ColumnRep[])
 * @returns { duplicatedMasks, patternMasks }
 */
/**
 * Find up to two unique brute-force duplicate patterns (boolean arrays) among the first 10 columns.
 * Returns the patterns and the indices of columns matching each pattern.
 */
export function findBruteForceDuplicatePatterns(columns: ColumnRep[]): {
	patterns: boolean[][]; // up to two unique patterns
	patternColumnIndices: number[][]; // indices of columns for each pattern
} {
	const seenPatterns: string[] = [];
	const patterns: boolean[][] = [];
	const patternColumnIndices: number[][] = [];

	// First pass: discover up to two unique patterns from all columns (using first 10 rows)
	for (let i = 0; i < columns.length; i++) {
		const col = columns[i];
		if (!Array.isArray(col.values)) continue;
		const mask = getDuplicatedMask(col.values).slice(0, 10);
		const sig = mask.join(',');
		if (seenPatterns.indexOf(sig) === -1 && patterns.length < 2) {
			seenPatterns.push(sig);
			patterns.push(mask);
			patternColumnIndices.push([]); // will fill in next pass
		}
	}

	// Second pass: assign every column to a pattern (if matched)
	for (let i = 0; i < columns.length; i++) {
		const col = columns[i];
		if (!Array.isArray(col.values)) continue;
		const mask = getDuplicatedMask(col.values).slice(0, 10);
		const sig = mask.join(',');
		const patternIdx = seenPatterns.indexOf(sig);
		if (patternIdx !== -1) {
			patternColumnIndices[patternIdx].push(i);
		}
		col.isDuplicate = getDuplicatedMask(col.values); // keep full mask for UI
		if (patternIdx === 0) {
			col.duplicatePattern = 'landDuplicatePattern'; // blue
		} else if (patternIdx === 1) {
			col.duplicatePattern = 'cropDuplicatePattern'; // green
		} else {
			col.duplicatePattern = 'randomDuplicatePattern'; // orange
		}
	}

	return { patterns, patternColumnIndices };
}

/**
 * Returns a boolean mask indicating which values are duplicated
 * @param values - Array of cell values
 * @returns Boolean array where true indicates a duplicated value
 */
export function getDuplicatedMask(values: (string | number | null)[]): boolean[] {
	const valueCount = new Map<string | number, number>();

	// Count occurrences
	for (const val of values) {
		if (val === null || val === '') continue;
		valueCount.set(val, (valueCount.get(val) || 0) + 1);
	}

	// Create the duplicate mask
	return values.map((val) => (val !== null && val !== '' ? (valueCount.get(val) ?? 0) > 1 : false));
}

/**
 * Creates a signature from the first N rows of a duplicate mask
 * @param duplicateMask - Boolean array indicating which values are duplicated
 * @param maxRows - Maximum number of rows to include in signature (default 10)
 * @returns A string signature representing the pattern
 */
function createSignature(duplicateMask: boolean[], maxRows: number = 20): string {
	// Take only the first maxRows (or fewer if the array is smaller)
	const rowsToUse = Math.min(duplicateMask.length, maxRows);

	// Convert to a simple binary string (1 for duplicate, 0 for unique)
	return duplicateMask
		.slice(0, rowsToUse)
		.map((isDup) => (isDup ? '1' : '0'))
		.join('');
}

/**
 * Returns a mask indicating which values are duplicated and what pattern they belong to
 * @param values - Array of cell values (string | number | null)
 * @returns Array of DuplicatePattern values
 */
export function getDuplicatePatternMask(values: (string | number | null)[]): DuplicatePattern[] {
	// First get the boolean duplicate mask
	const duplicateMask = getDuplicatedMask(values);

	// If no duplicates, return all 'none'
	if (!duplicateMask.some(Boolean)) {
		return Array(values.length).fill('none');
	}

	// Create a signature from the first 10 rows
	const signature = createSignature(duplicateMask, 10);

	// Check if we've seen this exact pattern before
	const existingIndex = patternSignatures.indexOf(signature);
	if (existingIndex >= 0) {
		// We've seen this pattern before
		// First pattern = landDuplicatePattern, second pattern = cropDuplicatePattern
		const patternType =
			patternSignatures.length === 1
				? 'landDuplicatePattern'
				: patternSignatures.length === 2
					? 'cropDuplicatePattern'
					: 'randomDuplicatePattern';
		return duplicateMask.map((isDup) => (isDup ? patternType : 'none'));
	}

	// This is a new pattern
	// Store the signature for future reference
	patternSignatures.push(signature);

	// First pattern we see is landDuplicatePattern, second is cropDuplicatePattern
	// Any additional patterns will be landDuplicatePattern
	const patternType =
		patternSignatures.length === 2 ? 'cropDuplicatePattern' : 'landDuplicatePattern';

	// Apply the pattern to all duplicated values
	return duplicateMask.map((isDup) => (isDup ? patternType : 'none'));
}
