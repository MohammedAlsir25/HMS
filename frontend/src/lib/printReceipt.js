function buildReceiptHtml(data, logoSrc) {
  const { title, transaction, items, patientName, mrn, clinicName } = data;
  const lines = items || [];

  const lineRows = lines.length > 0 ? lines.map((it, i) => `
            <tr>
              <td>${it.name || it.item?.name || ''}</td>
              <td style="text-align:center">${it.quantity}</td>
              <td style="text-align:right">${it.unitPrice !== undefined ? Number(it.unitPrice).toFixed(2) : Number(it.price || 0).toFixed(2)}</td>
              <td style="text-align:right">${it.total !== undefined ? Number(it.total).toFixed(2) : (Number(it.quantity) * Number(it.price || it.unitPrice || 0)).toFixed(2)}</td>
            </tr>`).join('') : `
            <tr>
              <td colspan="4" style="text-align:center;color:#888">${transaction.description || '—'}</td>
              <td style="text-align:right">${Number(transaction.amount).toFixed(2)}</td>
            </tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @page { margin: 5mm; size: 80mm auto; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 10px; font-size: 12px; }
  .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 10px; }
  .header h1 { margin: 0; font-size: 16px; color: #1a3a5c; }
  .header h2 { margin: 2px 0; font-size: 11px; color: #555; font-weight: normal; }
  .header .sub { margin-top: 4px; font-size: 11px; color: #1a3a5c; font-weight: bold; }
  .logo { height: 50px; margin-bottom: 4px; object-fit: contain; }
  .info { font-size: 11px; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; padding: 1px 0; }
  .info-label { color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #e8e8e8; color: #000; padding: 4px 6px; text-align: left; font-size: 11px; border: 1px solid #000; }
  td { padding: 3px 6px; border: 1px solid #444; font-size: 11px; }
  .totals { text-align: right; font-size: 13px; margin: 8px 0; padding-top: 4px; border-top: 1px solid #333; }
  .totals strong { font-size: 14px; }
  .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    ${logoSrc ? `<img src="${logoSrc}" alt="Al Jawarih Hospital" class="logo" />` : ''}
    <h1>Al Jawarih Hospital</h1>
    <h2>مستشفى الجوارح</h2>
    <div class="sub">${title || 'Receipt'}</div>
  </div>
  <div class="info">
    <div class="info-row"><span class="info-label">ID:</span><span>${transaction.id ? transaction.id.slice(0, 8).toUpperCase() : '—'}</span></div>
    ${patientName ? `<div class="info-row"><span class="info-label">Patient:</span><span>${patientName}</span></div>` : ''}
    ${mrn ? `<div class="info-row"><span class="info-label">MRN:</span><span>${mrn}</span></div>` : ''}
    ${clinicName ? `<div class="info-row"><span class="info-label">Clinic:</span><span>${clinicName}</span></div>` : ''}
    <div class="info-row"><span class="info-label">Date:</span><span>${new Date(transaction.createdAt).toLocaleDateString()}  ${new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="info-row"><span class="info-label">Cashier:</span><span>${transaction.cashier?.fullName || '—'}</span></div>
  </div>
  <table>
    <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <div class="totals">
    <strong>Total: SDG ${Number(transaction.amount).toFixed(2)}</strong><br>
    <span style="font-size:11px;color:#555">${transaction.paymentMethod}</span>
  </div>
  <div class="footer">Thank you!</div>
</body></html>`;
}

export async function printReceipt(data) {
  let logoSrc = '';
  try {
    const resp = await fetch('/logo.png');
    const blob = await resp.blob();
    logoSrc = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { /* no logo fallback */ }
  const html = buildReceiptHtml(data, logoSrc);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { alert('Please allow popups to print'); return; }
  setTimeout(() => { win.print(); }, 1000);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
