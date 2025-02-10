import type { ColumnAnalysis } from '$lib/shared/csv/validation/types';

export function exportToCSV(columns: ColumnAnalysis[], fileName: string) {
  // Convert the data to CSV format
  const headers = columns.map(col => col.name).join(',');
  const rows = columns[0].sampleValues.map((_, rowIndex) => {
    return columns.map(col => {
      const value = col.sampleValues[rowIndex] || '';
      // Escape commas and quotes
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName.replace('.csv', '_transformed.csv'));
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
