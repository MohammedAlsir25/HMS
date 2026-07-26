import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import DateRangePicker from '../../components/ui/DateRangePicker';
import RevenueReport from './RevenueReport';
import PatientReport from './PatientReport';
import OccupancyReport from './OccupancyReport';
import PharmacyReport from './PharmacyReport';
import LabReport from './LabReport';
import SurgeryReport from './SurgeryReport';
import HRReport from './HRReport';
import InsuranceReport from './InsuranceReport';

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'patients', label: 'Patients' },
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'lab', label: 'Lab' },
  { key: 'surgery', label: 'Surgery' },
  { key: 'hr', label: 'HR' },
  { key: 'insurance', label: 'Insurance' },
];

function handleExportPDF(title) {
  const content = document.getElementById('report-content');
  if (!content) return;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 20px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 18px; color: #1a3a5c; }
  .header .date { font-size: 11px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a3a5c; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; }
  .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #888; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <h1>Al Jawarih Hospital</h1>
    <div class="date">${title} — ${new Date().toLocaleDateString()}</div>
  </div>
  ${content.innerHTML}
  <div class="footer">Al Jawarih Hospital — مستشفى الجوارح</div>
</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
}

function handleExportCSV(title) {
  const content = document.getElementById('report-content');
  if (!content) return;

  const tables = content.querySelectorAll('table');
  if (tables.length === 0) {
    const rows = [[title, new Date().toISOString().slice(0, 10)], ['No tabular data to export']];
    const csvContent = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const csvChunks = [];
  tables.forEach((table, idx) => {
    if (idx > 0) csvChunks.push('');
    const headers = [];
    table.querySelectorAll('thead th').forEach((th) => headers.push(th.textContent.trim()));
    if (headers.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        firstRow.querySelectorAll('th, td').forEach((cell) => headers.push(cell.textContent.trim()));
      }
    }
    csvChunks.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((tr) => {
      const cells = [];
      tr.querySelectorAll('td').forEach((td) => {
        const text = td.textContent.trim().replace(/\s+/g, ' ');
        cells.push(text);
      });
      if (cells.length > 0) {
        csvChunks.push(cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(','));
      }
    });
  });

  const csvContent = csvChunks.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return { startDate: start, endDate: end };
  });

  const dateParams = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
  const activeLabel = TABS.find((t) => t.key === activeTab)?.label || 'Report';

  const renderTab = () => {
    switch (activeTab) {
      case 'revenue':
        return <RevenueReport dateParams={dateParams} />;
      case 'patients':
        return <PatientReport dateParams={dateParams} />;
      case 'occupancy':
        return <OccupancyReport dateParams={dateParams} />;
      case 'pharmacy':
        return <PharmacyReport dateParams={dateParams} />;
      case 'lab':
        return <LabReport dateParams={dateParams} />;
      case 'surgery':
        return <SurgeryReport dateParams={dateParams} />;
      case 'hr':
        return <HRReport dateParams={dateParams} />;
      case 'insurance':
        return <InsuranceReport dateParams={dateParams} />;
      default:
        return <RevenueReport dateParams={dateParams} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Reports & Analytics</h1>
          <p className="text-body text-slate mt-1">Hospital-wide analytics and reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleExportPDF(`${activeLabel} Report`)}>
            Export PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExportCSV(`${activeLabel} Report`)}>
            Export CSV
          </Button>
        </div>
      </div>

      <DateRangePicker
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={setDateRange}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-caption font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.key
                ? 'bg-lilac-bloom/20 text-obsidian'
                : 'text-slate hover:text-obsidian hover:bg-bone/50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="report-content">
        {renderTab()}
      </div>
    </div>
  );
}
