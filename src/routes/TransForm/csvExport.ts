interface Column {
  name: string;
  currentType: string;
  allValues: string[];
  sampleValues: string[];
  transformedValues?: string[];
}

export function exportToCSV(columns: Column[]) {
  if (!columns?.length) {
    console.error('No columns to export');
    return;
  }

  // Create CSV content
  const header = columns.map(col => col.name).join(',');
  
  // Get the number of rows from the first column
  const numRows = columns[0].allValues.length;
  
  // Create rows using the values directly - they should already be transformed
  const rows = [];
  for (let i = 0; i < numRows; i++) {
    const row = columns.map(col => {
      const value = (col.transformedValues?.[i] ?? col.allValues[i]) || ''.toString();
      // Escape values containing commas
      return value.includes(',') ? `"${value}"` : value;
    }).join(',');
    rows.push(row);
  }

  const csvContent = [header, ...rows].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `transform_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
