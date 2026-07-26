import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBalanceSheet } from '../../hooks/queries/useBalanceSheet';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/currency';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function BalanceSheet() {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = useState('');
  const { data, isLoading, isError, error } = useBalanceSheet(asOfDate);

  const handlePrint = useCallback(() => {
    const content = document.getElementById('balance-sheet-printable');
    if (!content) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Balance Sheet</title>
<style>
  @page { margin: 15mm; size: A4 landscape; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 20px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
  h2 { text-align: center; font-size: 12px; color: #555; font-weight: normal; margin-bottom: 4px; }
  .date { text-align: center; font-size: 12px; color: #888; margin-bottom: 20px; }
  .container { display: flex; gap: 20px; }
  .column { flex: 1; border: 1px solid #ccc; border-radius: 4px; }
  .column-header { background: #f0f0f0; padding: 8px 12px; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; }
  .section { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .section-title { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #555; margin-bottom: 4px; }
  .line-item { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .subtotal { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 600; font-size: 12px; border-top: 1px solid #ccc; margin-top: 4px; }
  .total { display: flex; justify-content: space-between; padding: 8px 12px; font-weight: bold; font-size: 14px; border-top: 2px solid #000; }
  .balance-check { text-align: center; margin-top: 16px; padding: 8px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; }
  .balanced { color: green; } .unbalanced { color: red; }
  @media print { body { padding: 0; } }
</style></head><body>
${content.innerHTML}
</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.balanceSheet', 'Balance Sheet')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.balanceSheet', 'Balance Sheet')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load balance sheet'}
        </div>
      </div>
    );
  }

  const assets = data?.assets || { current: [], fixed: [], total: 0 };
  const liabilities = data?.liabilities || { current: [], longTerm: [], total: 0 };
  const equity = data?.equity || { total: 0 };
  const balanceCheck = data?.balanceCheck;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.balanceSheet', 'Balance Sheet')}</h1>
          <p className="text-body text-slate mt-1">{t('accounting.asOf', 'As of')} {asOfDate || getToday()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-graphite block mb-1">As of Date</label>
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={handlePrint}>{t('accounting.print', 'Print')}</Button>
          </div>
        </div>
      </div>

      {balanceCheck !== undefined && (
        <div className={`flex items-center justify-center p-3 rounded-lg ${balanceCheck ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          <Badge variant={balanceCheck ? 'success' : 'danger'}>
            {balanceCheck ? '✓ Balanced' : '✗ Unbalanced'}
          </Badge>
        </div>
      )}

      <div id="balance-sheet-printable">
        <h1 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>Al Jawarih Hospital</h1>
        <h2 style={{ textAlign: 'center', fontSize: '12px', color: '#555', marginBottom: '4px' }}>مستشفى الجوارح</h2>
        <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Balance Sheet</p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginBottom: '20px' }}>As of {asOfDate || getToday()}</p>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
            <div style={{ background: '#f0f0f0', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ccc' }}>Assets</div>
            {assets.current?.length > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>Current Assets</div>
                {assets.current.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
                    <span>{item.name || item.code}</span>
                    <span>{formatCurrency(item.balance || 0)}</span>
                  </div>
                ))}
              </div>
            )}
            {assets.fixed?.length > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>Fixed Assets</div>
                {assets.fixed.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
                    <span>{item.name || item.code}</span>
                    <span>{formatCurrency(item.balance || 0)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #000' }}>
              <span>Total Assets</span>
              <span>{formatCurrency(assets.total || 0)}</span>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ background: '#f0f0f0', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ccc' }}>Liabilities</div>
              {liabilities.current?.length > 0 && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>Current Liabilities</div>
                  {liabilities.current.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
                      <span>{item.name || item.code}</span>
                      <span>{formatCurrency(item.balance || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              {liabilities.longTerm?.length > 0 && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>Long-Term Liabilities</div>
                  {liabilities.longTerm.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
                      <span>{item.name || item.code}</span>
                      <span>{formatCurrency(item.balance || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #000' }}>
                <span>Total Liabilities</span>
                <span>{formatCurrency(liabilities.total || 0)}</span>
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ background: '#f0f0f0', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ccc' }}>Equity</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #000' }}>
                <span>Total Equity</span>
                <span>{formatCurrency(equity.total || 0)}</span>
              </div>
            </div>

            <div style={{ border: '2px solid #000', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', padding: '12px', fontWeight: 'bold', fontSize: '16px' }}>
              <span>Liabilities + Equity</span>
              <span>{formatCurrency((liabilities.total || 0) + (equity.total || 0))}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('accounting.assets', 'Assets')}</CardTitle></CardHeader>
          <CardContent>
            {assets.current?.length === 0 && assets.fixed?.length === 0 ? (
              <p className="text-body text-slate text-center py-4">{t('accounting.noData', 'No asset data')}</p>
            ) : (
              <div className="space-y-4">
                {assets.current?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-graphite mb-2">Current Assets</h4>
                    {assets.current.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 text-sm border-b border-silver/50">
                        <span className="text-obsidian">{item.name || item.code}</span>
                        <span className="font-medium">{formatCurrency(item.balance || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {assets.fixed?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-graphite mb-2">Fixed Assets</h4>
                    {assets.fixed.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 text-sm border-b border-silver/50">
                        <span className="text-obsidian">{item.name || item.code}</span>
                        <span className="font-medium">{formatCurrency(item.balance || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-obsidian font-semibold">
                  <span className="text-obsidian">Total Assets</span>
                  <span>{formatCurrency(assets.total || 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('accounting.liabilitiesEquity', 'Liabilities & Equity')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {liabilities.current?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-graphite mb-2">Current Liabilities</h4>
                  {liabilities.current.map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-sm border-b border-silver/50">
                      <span className="text-obsidian">{item.name || item.code}</span>
                      <span className="font-medium">{formatCurrency(item.balance || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              {liabilities.longTerm?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-graphite mb-2">Long-Term Liabilities</h4>
                  {liabilities.longTerm.map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-sm border-b border-silver/50">
                      <span className="text-obsidian">{item.name || item.code}</span>
                      <span className="font-medium">{formatCurrency(item.balance || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-silver font-semibold">
                <span className="text-obsidian">Total Liabilities</span>
                <span>{formatCurrency(liabilities.total || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-silver">
                <span className="text-obsidian">Total Equity</span>
                <span>{formatCurrency(equity.total || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-obsidian font-bold text-lg">
                <span className="text-obsidian">Liabilities + Equity</span>
                <span>{formatCurrency((liabilities.total || 0) + (equity.total || 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
