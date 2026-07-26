interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'percent' | 'number' | 'text';
}

interface HospitalInfo {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}

export function generateReportPdf(
  title: string,
  data: Record<string, unknown>[],
  columns: Column[],
  dateRange: { startDate?: string; endDate?: string },
  hospitalInfo: HospitalInfo,
): string {
  const formatValue = (val: unknown, fmt?: string): string => {
    if (val === null || val === undefined) return '-';
    if (fmt === 'currency') return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (fmt === 'percent') return `${Number(val)}%`;
    if (fmt === 'number') return Number(val).toLocaleString('en-US');
    return String(val);
  };

  const headerCells = columns.map((c) => `<th style="padding:10px 12px;background:#2d3a4a;color:#fff;text-align:${c.align || 'left'};font-size:12px;font-weight:600;border:1px solid #ddd;">${c.label}</th>`).join('');

  const bodyRows = data.map((row) => {
    const cells = columns.map((c) => {
      const val = row[c.key];
      return `<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:${c.align || 'left'};font-size:12px;">${formatValue(val, c.format)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const dateStr = dateRange.startDate || dateRange.endDate
    ? `${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`
    : 'Current Period';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
  .container { max-width: 900px; margin: 0 auto; padding: 24px; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #2d3a4a; padding-bottom: 16px; margin-bottom: 20px; }
  .header img { height: 50px; }
  .header-text h1 { font-size: 22px; color: #2d3a4a; }
  .header-text p { font-size: 13px; color: #6b7280; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; color: #6b7280; }
  .report-title { font-size: 18px; font-weight: 700; color: #2d3a4a; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { .container { padding: 0; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    ${hospitalInfo.logoUrl ? `<img src="${hospitalInfo.logoUrl}" alt="Logo">` : ''}
    <div class="header-text">
      <h1>${hospitalInfo.name}</h1>
      ${hospitalInfo.address ? `<p>${hospitalInfo.address}</p>` : ''}
      ${hospitalInfo.phone ? `<p>${hospitalInfo.phone}</p>` : ''}
    </div>
  </div>
  <div class="meta">
    <div class="report-title">${title}</div>
    <div>Period: ${dateStr}</div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="' + columns.length + '" style="padding:20px;text-align:center;color:#9ca3af;">No data available</td></tr>'}</tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()} | ${hospitalInfo.name}</div>
</div>
</body>
</html>`;
}
