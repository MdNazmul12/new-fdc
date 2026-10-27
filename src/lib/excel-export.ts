'use client';

import * as XLSX from 'xlsx';

/**
 * Exports tabular data to a real Microsoft Excel (.xlsx) file
 * with auto-calculated column widths.
 */
export function exportToExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetName: string = 'FDC_Report'
): void {
  if (!rows || rows.length === 0) {
    alert('No data records available to export.');
    return;
  }

  try {
    // 1. Convert JSON data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // 2. Set auto column widths based on maximum string lengths
    const keys = Object.keys(rows[0] || {});
    const colWidths = keys.map((key) => {
      let maxLen = key.length;
      for (const row of rows) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    worksheet['!cols'] = colWidths;

    // 3. Create a new workbook and append sheet
    const workbook = XLSX.utils.book_new();
    const cleanSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    // 4. Trigger download in browser
    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, cleanFilename);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    alert('Failed to generate Excel file. Please try again.');
  }
}
