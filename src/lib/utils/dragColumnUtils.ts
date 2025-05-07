// // File: /Users/chrisharris/Desktop/transplant/src/lib/utils/dragColumnUtils.ts

// /**
//  * Utility functions for handling column drag and drop operations
//  * Used by both data tables and database target tables
//  */

// // Debug flag to control logging
// const DEBUG = false;

// // Logger utility for consistent and controlled logging
// const logger = {
// 	debug: (message: string, ...args: any[]) => {
// 		if (DEBUG) console.log(`[DragColumnUtils] ${message}`, ...args);
// 	},
// 	info: (message: string, ...args: any[]) => {
// 		console.log(`[DragColumnUtils] ${message}`, ...args);
// 	},
// 	warn: (message: string, ...args: any[]) => {
// 		console.warn(`[DragColumnUtils] ${message}`, ...args);
// 	},
// 	error: (message: string, ...args: any[]) => {
// 		console.error(`[DragColumnUtils] ${message}`, ...args);
// 	}
// };

// /**
//  * Creates a custom drag image showing the entire column (header and data)
//  * @param header The column header text
//  * @param columnType The data type of the column
//  * @param records Array of data records
//  * @returns The created drag image element
//  */
// export function createColumnDragImage(
// 	header: string,
// 	columnType: string,
// 	records: Array<Record<string, any>>,
// 	formatColumnType: (type: string) => string = (type) =>
// 		type.charAt(0).toUpperCase() + type.slice(1)
// ): HTMLElement {
// 	// Create a container for our custom drag image
// 	const dragImageContainer = document.createElement('div');
// 	applyStyles(dragImageContainer, {
// 		position: 'absolute',
// 		top: '-1000px',
// 		opacity: '0.8f5',
// 		background: 'white',
// 		border: '1px var(--color-gray) solid',
// 		borderRadius: '4px',
// 		boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
// 		zIndex: '9999',
// 		width: '180px',
// 		overflow: 'hidden'
// 	});

// 	// Create a table for the drag image
// 	const table = document.createElement('table');
// 	applyStyles(table, {
// 		width: '100%',
// 		borderCollapse: 'collapse'
// 	});

// 	// Create header
// 	const thead = document.createElement('thead');
// 	const headerRow = document.createElement('tr');
// 	const headerCell = document.createElement('th');
// 	applyStyles(headerCell, {
// 		padding: '8px',
// 		textAlign: 'left',
// 		borderBottom: '1px solid #ddd',
// 		backgroundColor: '#f5f5f5',
// 		fontWeight: 'bold'
// 	});

// 	// Add header content similar to the original header
// 	const headerContent = document.createElement('div');
// 	applyStyles(headerContent, {
// 		display: 'flex',
// 		flexDirection: 'column',
// 		alignItems: 'flex-start'
// 	});

// 	const typeSpan = document.createElement('span');
// 	applyStyles(typeSpan, {
// 		fontSize: '0.8em',
// 		padding: '2px 4px',
// 		background: '#eee',
// 		borderRadius: '3px',
// 		marginBottom: '2px'
// 	});
// 	typeSpan.textContent = formatColumnType(columnType);

// 	const headerTextSpan = document.createElement('span');
// 	headerTextSpan.textContent = header;

// 	headerContent.appendChild(typeSpan);
// 	headerContent.appendChild(headerTextSpan);
// 	headerCell.appendChild(headerContent);
// 	headerRow.appendChild(headerCell);
// 	thead.appendChild(headerRow);
// 	table.appendChild(thead);

// 	// Create body with data cells (up to 3 rows for preview)
// 	const tbody = document.createElement('tbody');
// 	const maxPreviewRows = Math.min(3, records.length);

// 	for (let i = 0; i < maxPreviewRows; i++) {
// 		const dataRow = document.createElement('tr');
// 		const dataCell = document.createElement('td');
// 		applyStyles(dataCell, {
// 			padding: '8px',
// 			textAlign: 'left',
// 			borderBottom: '1px solid #eee',
// 			whiteSpace: 'nowrap',
// 			overflow: 'hidden',
// 			textOverflow: 'ellipsis',
// 			maxWidth: '160px'
// 		});

// 		// Get the cell value
// 		const cellValue = records[i][header];
// 		dataCell.textContent = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';

// 		dataRow.appendChild(dataCell);
// 		tbody.appendChild(dataRow);
// 	}

// 	table.appendChild(tbody);
// 	dragImageContainer.appendChild(table);

// 	return dragImageContainer;
// }

// /**
//  * Sets up a drag operation with a custom column drag image
//  * @param event The drag event
//  * @param header The column header being dragged
//  * @param columnType The data type of the column
//  * @param records Array of data records
//  * @param formatColumnType Optional function to format column type for display
//  */
// export function setupColumnDrag(
// 	event: DragEvent,
// 	header: string,
// 	columnType: string,
// 	records: Array<Record<string, any>>,
// 	formatColumnType: (type: string) => string = (type) =>
// 		type.charAt(0).toUpperCase() + type.slice(1)
// ): void {
// 	if (!event.dataTransfer) return;

// 	// Set the drag data
// 	event.dataTransfer.setData('text/plain', header);
// 	event.dataTransfer.setData(
// 		'application/json',
// 		JSON.stringify({
// 			header,
// 			columnType
// 		})
// 	);
// 	event.dataTransfer.effectAllowed = 'move';

// 	try {
// 		// Create the custom drag image
// 		const dragImageContainer = createColumnDragImage(header, columnType, records, formatColumnType);

// 		// Add the drag image container to the document temporarily
// 		document.body.appendChild(dragImageContainer);

// 		// Set the custom drag image
// 		const offsetX = 20;
// 		const offsetY = 10;
// 		event.dataTransfer.setDragImage(dragImageContainer, offsetX, offsetY);

// 		// Schedule removal of the drag image element after the drag operation starts
// 		setTimeout(() => {
// 			if (document.body.contains(dragImageContainer)) {
// 				document.body.removeChild(dragImageContainer);
// 			}
// 		}, 0);
// 	} catch (error) {
// 		logger.error('Error setting custom drag image:', error);
// 		// Fall back to default drag behavior if custom image fails
// 	}
// }

// /**
//  * Helper function to apply multiple styles to an HTML element
//  * @param element The HTML element to style
//  * @param styles Object containing styles to apply
//  */
// export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
// 	Object.entries(styles).forEach(([property, value]) => {
// 		element.style[property as any] = value;
// 	});
// }

// /**
//  * Add CSS styles to the document for drag and drop operations
//  */
// export function addDragDropStyles(): void {
// 	// Check if styles are already added
// 	if (document.getElementById('transplant-drag-drop-styles')) return;

// 	const styleElement = document.createElement('style');
// 	styleElement.id = 'transplant-drag-drop-styles';
// 	styleElement.textContent = `
//         [draggable="true"] {
//             cursor: grab;
//         }
        
//         [draggable="true"]:active {
//             cursor: grabbing;
//         }
        
//         // .dragging {
//         //     opacity: 0.5;
//         // }
        
//         // .drop-target {
//         //     background-color: transparent !important;
//         //     outline: 2px dashed #007bff;
//         // }
        
//         // .drop-target * {
//         //     pointer-events: none;
//         // }

//         // /* Styles for the database target table */
//         // .compatible-target {
//         //     outline: 1px solid #28a745;
//         //     background-color: transparent !important;
//         // }
        
//         // .incompatible-target {
//         //     outline: 1px solid #dc3545;
//         //     opacity: 0.6;
//         //     background-color: transparent !important;
//         // }
        
//         // .drag-over {
//         //     outline: 1px dashed #007bff;
//         //     background-color: transparent !important;
//         // }
        
//         // /* Fix for the ghost column and bright white background */
//         // .table-container {
//         //     background-color: #1e1e2e;
//         // }
        
//         // td, th {
//         //     border-bottom: 1px solid #333 !important;
//         //     background-color: transparent !important;
//         // }
//     `;

// 	document.head.appendChild(styleElement);
// }

// /**
//  * Determines if an element is part of a column (either header or cell)
//  * @param element The element to check
//  * @param columnSelector The selector for column elements
//  * @returns The column element if found, null otherwise
//  */
// export function findColumnElement(
// 	element: HTMLElement,
// 	columnSelector: string
// ): HTMLElement | null {
// 	let current: HTMLElement | null = element;

// 	while (current && !current.matches(columnSelector)) {
// 		current = current.parentElement;
// 	}

// 	return current;
// }
