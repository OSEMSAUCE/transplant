/**
 * ColumnRep model implementation for TransPlant
 * This file provides concrete implementations of the ColumnRep interfaces
 * defined in columnTypes.ts, with methods for working with column data.
 */
/**
 * Base column model with shared implementation
 * [NEW] Core class of the ColumnRep architecture
 * [INTENTION: Will replace existing column handling in TransformManager.svelte]
 */
export class BaseColumnModel {
    constructor(headerName) {
        this.type = 'string';
        this.currentFormat = 'string';
        this.headerName = headerName;
        this.isToggled = true;
        this.isGreyed = [false];
        this.isMapped = false;
        this.isFormatted = false;
    }
    changeFormat(newType, changedBy = 'user') {
        if (this.type !== newType) {
            this.selectFormatCoercion = {
                originalFormat: this.type,
                coercedFormat: newType,
                timestamp: new Date(),
                changedBy,
                userSelected: changedBy === 'user' // Set based on who changed it
            };
            this.type = newType;
            this.isFormatted = false;
            this.currentFormat = newType;
        }
    }
    // Add a method to check if type was coerced
    get wasFormatCoerced() {
        return (!!this.selectFormatCoercion &&
            this.selectFormatCoercion.originalFormat !== this.selectFormatCoercion.coercedFormat);
    }
}
/**
 * String column implementation
 *
 * [NEW] Core class of the ColumnRep architecture
 */
