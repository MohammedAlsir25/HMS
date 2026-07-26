export function buildA4Receipt(data, logoSrc) {
  const { title, transaction, items, patientName, mrn } = data;
  const lines = items || [];

  const lineRows = lines.length > 0
    ? lines.map((it) => {
        const name = it.name || it.item?.name || it.description || '';
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice !== undefined ? it.unitPrice : it.price || 0);
        const total = Number(it.total !== undefined ? it.total : qty * price);
        return `<tr>
          <td style="padding:8px 10px;border:1px solid #ddd;font-size:11px">${name}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-size:11px">${qty}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-size:11px">${price.toFixed(2)}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-size:11px">${total.toFixed(2)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:8px 10px;border:1px solid #ddd;text-align:center;color:#888;font-size:11px">${transaction.description || '—'}</td></tr>`;

  const subtotal = lines.reduce((sum, it) => sum + (Number(it.total !== undefined ? it.total : (Number(it.quantity) || 0) * (Number(it.unitPrice || it.price || 0)))), 0);
  const discount = Number(transaction.discount) || 0;
  const tax = Number(transaction.tax) || 0;
  const total = Number(transaction.amount) || subtotal - discount + tax;
  const amountPaid = Number(transaction.amountPaid) || 0;
  const balance = total - amountPaid;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || 'Invoice'}</title>
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 20px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { height: 60px; object-fit: contain; }
  .header-text h1 { margin: 0; font-size: 18px; color: #1a3a5c; }
  .header-text h2 { margin: 2px 0; font-size: 12px; color: #555; font-weight: normal; }
  .header-right { text-align: right; }
  .header-right .title { font-size: 20px; font-weight: bold; color: #1a3a5c; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .info-box { padding: 10px; background: #f8f8f8; border-radius: 4px; }
  .info-box h3 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #888; }
  .info-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
  .info-label { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a3a5c; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; }
  .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .totals-table { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totals-row.total { font-weight: bold; font-size: 14px; border-top: 2px solid #1a3a5c; padding-top: 8px; margin-top: 4px; }
  .payment-box { padding: 10px; background: #f0f9f0; border: 1px solid #c3e6cb; border-radius: 4px; margin-bottom: 20px; }
  .payment-box h3 { margin: 0 0 6px 0; font-size: 12px; color: #155724; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
  .signature-line { width: 200px; text-align: center; }
  .signature-line .line { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 10px; color: #555; }
  .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #888; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${logoSrc ? `<img src="${logoSrc}" alt="Al Jawarih Hospital" class="logo" />` : ''}
      <div class="header-text">
        <h1>Al Jawarih Hospital</h1>
        <h2>مستشفى الجوارح</h2>
      </div>
    </div>
    <div class="header-right">
      <div class="title">${title || 'INVOICE'}</div>
      <div style="font-size:11px;color:#888;margin-top:4px">No: ${transaction.id ? transaction.id.slice(0, 8).toUpperCase() : '—'}</div>
      <div style="font-size:11px;color:#888">${new Date(transaction.createdAt).toLocaleDateString()}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Patient Information</h3>
      ${patientName ? `<div class="info-row"><span class="info-label">Name:</span><span>${patientName}</span></div>` : ''}
      ${mrn ? `<div class="info-row"><span class="info-label">MRN:</span><span>${mrn}</span></div>` : ''}
    </div>
    <div class="info-box">
      <h3>Payment Details</h3>
      <div class="info-row"><span class="info-label">Date:</span><span>${new Date(transaction.createdAt).toLocaleDateString()}</span></div>
      <div class="info-row"><span class="info-label">Method:</span><span>${transaction.paymentMethod || '—'}</span></div>
      <div class="info-row"><span class="info-label">Cashier:</span><span>${transaction.cashier?.fullName || '—'}</span></div>
    </div>
  </div>

  <table>
    <thead><tr><th style="width:50%">Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:20%;text-align:right">Unit Price</th><th style="width:20%;text-align:right">Total</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals-section">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal:</span><span>SDG ${subtotal.toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-SDG ${discount.toFixed(2)}</span></div>` : ''}
      ${tax > 0 ? `<div class="totals-row"><span>Tax:</span><span>SDG ${tax.toFixed(2)}</span></div>` : ''}
      <div class="totals-row total"><span>Total:</span><span>SDG ${total.toFixed(2)}</span></div>
      <div class="totals-row"><span>Amount Paid:</span><span style="color:#155724">SDG ${amountPaid.toFixed(2)}</span></div>
      ${balance > 0 ? `<div class="totals-row"><span>Balance Due:</span><span style="color:#c0392b;font-weight:bold">SDG ${balance.toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  ${amountPaid > 0 ? `<div class="payment-box"><h3>Payment Received</h3><div class="info-row"><span class="info-label">Amount:</span><span>SDG ${amountPaid.toFixed(2)}</span></div><div class="info-row"><span class="info-label">Method:</span><span>${transaction.paymentMethod || '—'}</span></div></div>` : ''}

  <div class="signatures">
    <div class="signature-line"><div class="line">Authorized Signature</div></div>
    <div class="signature-line"><div class="line">Patient / Customer Signature</div></div>
  </div>

  <div class="footer">Al Jawarih Hospital &mdash; مستشفى الجوارح | Thank you for choosing our services</div>
</body></html>`;
}

function buildReceiptHtml(data, logoSrc) {
  const { title, transaction, items, patientName, mrn, clinicName } = data;
  const lines = items || [];

  const lineRows = lines.length > 0 ? lines.map((it) => `
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

export async function printReceipt(data, format = 'thermal') {
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
  const html = format === 'a4' ? buildA4Receipt({ ...data, logoSrc }) : buildReceiptHtml(data, logoSrc);
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
