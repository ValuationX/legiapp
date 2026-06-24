// Small wrapper around exceljs for formatted workbook downloads. exceljs is large,
// so it's dynamically imported here — Vite splits it into its own chunk that only
// loads when an export actually runs (never in the initial bundle).

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
}

/** Guard spreadsheet formula injection on string cells (leading =,+,-,@,tab,CR). */
function sanitizeCell(v: unknown): unknown {
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return v;
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Build and download a multi-sheet .xlsx: bold + frozen header row, auto-sized columns. */
export async function downloadWorkbook(filename: string, sheets: SheetSpec[]): Promise<void> {
  // exceljs ships CJS; resolve the namespace defensively across interop shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
    for (const row of sheet.rows) {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) safe[k] = sanitizeCell(v);
      ws.addRow(safe);
    }
    // Auto-size each column to its widest cell (clamped 10–60).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.columns.forEach((col: any) => {
      let max = String(col.header ?? '').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      col.eachCell?.({ includeEmpty: false }, (cell: any) => {
        const len = cell.value == null ? 0 : String(cell.value).length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 10), 60);
    });
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    filename,
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}
