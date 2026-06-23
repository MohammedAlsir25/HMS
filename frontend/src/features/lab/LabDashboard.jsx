import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

const statusBadge = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const priorityBadge = {
  ROUTINE: 'default',
  URGENT: 'danger',
  STAT: 'danger',
};

function OrderDetailModal({ order, open, onClose, onSave }) {
  const { t } = useTranslation();
  const [results, setResults] = useState({});
  const [resultNotes, setResultNotes] = useState('');

  useEffect(() => {
    if (order) {
      const init = {};
      order.tests?.forEach((ot) => {
        init[ot.testId] = ot.resultValue || '';
      });
      setResults(init);
      setResultNotes(order.resultNotes || '');
    }
  }, [order]);

  const handleSave = useCallback(async () => {
    try {
      const payload = {
        results: Object.entries(results).map(([testId, resultValue]) => ({
          testId,
          resultValue,
          orderTestId: order.tests?.find((ot) => ot.testId === testId)?.id,
        })),
        resultNotes,
      };
      const updated = await api.put(`/lab/orders/${order.id}/results`, payload);
      if (onSave) onSave(updated);
      onClose();
    } catch { /* ignore */ }
  }, [order, results, resultNotes, onSave, onClose]);

  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${t('lab.enterResults')} — ${order.patient?.fullName || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge[order.status]}>{t('lab.' + order.status.toLowerCase())}</Badge>
          <Badge variant={priorityBadge[order.priority]}>{order.priority}</Badge>
          {order.assignedTo && (
            <span className="text-caption text-slate">{t('lab.assignedTo')}: {order.assignedTo}</span>
          )}
        </div>

        <div className="space-y-3">
          {order.tests?.map((ot) => (
            <div key={ot.id} className="bg-bone rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-obsidian">{ot.test?.name || ot.testId}</span>
                {ot.test?.unit && <span className="text-caption text-slate">{ot.test.unit}</span>}
              </div>
              {ot.test?.refRange && (
                <p className="text-caption text-slate">{t('lab.refRange')}: {ot.test.refRange}</p>
              )}
              <Input
                label={t('lab.value')}
                type="text"
                value={results[ot.testId] || ''}
                onChange={(e) => setResults({ ...results, [ot.testId]: e.target.value })}
                placeholder="Enter result value..."
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">{t('lab.resultNotes')}</label>
          <textarea
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full h-20 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave}>{t('lab.saveResults')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

function NewRequestModal({ open, onClose, onCreated }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('patient');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [testCatalog, setTestCatalog] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('patient');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPatient(null);
      setSelectedTests([]);
      setPriority('ROUTINE');
      setClinicalNotes('');
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length < 2 || step !== 'patient') return;
    const timer = setTimeout(() => {
      setSearching(true);
      api.get(`/reception/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get('/lab/tests');
      setTestCatalog(data || []);
    } catch {
      setTestCatalog([]);
    }
  }, []);

  useEffect(() => {
    if (step === 'tests') loadCatalog();
  }, [step, loadCatalog]);

  const toggleTest = useCallback((testId) => {
    setSelectedTests((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPatient || selectedTests.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.post('/lab/orders', {
        patientId: selectedPatient.id,
        testIds: selectedTests,
        priority,
        clinicalNotes: clinicalNotes || null,
      });
      if (onCreated) onCreated(order);
      onClose();
    } catch { /* ignore */ }
    setSubmitting(false);
  }, [selectedPatient, selectedTests, priority, clinicalNotes, onCreated, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={t('lab.requestTest')}>
      <div className="space-y-4">
        {step === 'patient' && (
          <>
            <Input
              label="Search patient"
              placeholder="Name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && <p className="text-caption text-slate">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-bone touch-target text-body text-obsidian"
                    onClick={() => { setSelectedPatient(p); setStep('tests'); }}
                  >
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-caption text-slate ml-2">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'tests' && selectedPatient && (
          <>
            <div className="bg-bone rounded-lg px-4 py-3">
              <p className="text-body font-medium text-obsidian">{selectedPatient.fullName}</p>
              <p className="text-caption text-slate">{selectedPatient.mrn}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-graphite block mb-1">{t('lab.priority')}</label>
              <div className="flex gap-2">
                {['ROUTINE', 'URGENT', 'STAT'].map((p) => (
                  <button
                    key={p}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                      ${priority === p ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-graphite block mb-1">{t('lab.category')}</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {testCatalog.map((test) => (
                  <label key={test.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bone cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="accent-lilac-bloom"
                    />
                    <div className="flex-1">
                      <span className="text-body text-obsidian">{test.name}</span>
                      {test.category && <span className="text-caption text-slate ml-2">({test.category})</span>}
                    </div>
                    {test.price && <span className="text-caption text-slate">{test.price}</span>}
                  </label>
                ))}
              </div>
              {testCatalog.length === 0 && (
                <p className="text-caption text-slate">{t('common.noData')}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-graphite block mb-1">{t('lab.clinicalNotes')}</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Optional clinical notes..."
                className="w-full h-20 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={selectedTests.length === 0 || submitting}>
                {submitting ? 'Submitting...' : t('lab.submit')}
              </Button>
              <Button variant="secondary" onClick={() => setStep('patient')}>Change Patient</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function CatalogManager({ onRefresh }) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTest, setEditTest] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/lab/tests');
      setCatalog(data || []);
    } catch {
      setCatalog([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleSave = useCallback(async (test) => {
    try {
      if (test.id) {
        await api.put(`/lab/tests/${test.id}`, test);
      } else {
        await api.post('/lab/tests', test);
      }
      loadCatalog();
      if (onRefresh) onRefresh();
      setEditTest(null);
    } catch { /* ignore */ }
  }, [loadCatalog, onRefresh]);

  if (loading) return <p className="text-caption text-slate">{t('common.loading')}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditTest({ name: '', code: '', category: '', specimen: '', unit: '', refRange: '', price: 0 })}>
          {t('lab.addTest')}
        </Button>
      </div>

      <Table
        columns={[
          { key: 'code', label: t('lab.testCode') },
          { key: 'name', label: t('lab.testName') },
          { key: 'category', label: t('lab.category') },
          { key: 'specimen', label: t('lab.specimen') },
          { key: 'unit', label: t('lab.unit') },
          { key: 'refRange', label: t('lab.refRange') },
          { key: 'price', label: t('lab.price'), render: (v) => v != null ? `AED ${Number(v).toFixed(2)}` : '-' },
          { key: 'actions', label: t('lab.actions'), render: (row) => (
            <button onClick={() => setEditTest(row)} className="text-lilac-bloom hover:underline text-caption">
              {t('common.edit')}
            </button>
          )},
        ]}
        data={catalog}
      />

      {editTest && (
        <CatalogEditModal
          test={editTest}
          onSave={handleSave}
          onClose={() => setEditTest(null)}
        />
      )}
    </div>
  );
}

function CatalogEditModal({ test, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...test });

  return (
    <Modal open={true} onClose={onClose} title={test.id ? t('lab.editTest') : t('lab.addTest')}>
      <div className="space-y-3">
        <Input label={t('lab.testName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t('lab.testCode')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input label={t('lab.category')} value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Input label={t('lab.specimen')} value={form.specimen || ''} onChange={(e) => setForm({ ...form, specimen: e.target.value })} />
        <Input label={t('lab.unit')} value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <Input label={t('lab.refRange')} value={form.refRange || ''} onChange={(e) => setForm({ ...form, refRange: e.target.value })} />
        <Input label={t('lab.price')} type="number" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : null })} />
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(form)}>Save</Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LabDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('queue');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [stats, setStats] = useState(null);
  const [billingOrders, setBillingOrders] = useState([]);
  const [selectedForBilling, setSelectedForBilling] = useState([]);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState('CASH');
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const data = await api.get(`/lab/orders${params}`);
      setOrders(data || []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, [statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/lab/stats');
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleClaim = useCallback(async (orderId) => {
    try {
      await api.patch(`/lab/orders/${orderId}/claim`);
      loadOrders();
    } catch { /* ignore */ }
  }, [loadOrders]);

  const handleUnclaim = useCallback(async (orderId) => {
    try {
      await api.patch(`/lab/orders/${orderId}/unclaim`);
      loadOrders();
    } catch { /* ignore */ }
  }, [loadOrders]);

  const handleComplete = useCallback(async (orderId) => {
    try {
      await api.patch(`/lab/orders/${orderId}/status`, { status: 'COMPLETED' });
      loadOrders();
      loadStats();
    } catch { /* ignore */ }
  }, [loadOrders, loadStats]);

  const handleCancel = useCallback(async (orderId) => {
    try {
      await api.patch(`/lab/orders/${orderId}/status`, { status: 'CANCELLED' });
      loadOrders();
    } catch { /* ignore */ }
  }, [loadOrders]);

  const handleViewDetail = useCallback((order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  }, []);

  const loadBillingOrders = useCallback(async () => {
    try {
      const data = await api.get('/lab/orders?status=COMPLETED');
      setBillingOrders(data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'billing') loadBillingOrders();
  }, [activeTab, loadBillingOrders]);

  const toggleBillingOrder = (orderId) => {
    setSelectedForBilling((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBillingCheckout = async () => {
    if (selectedForBilling.length === 0) { alert('Select at least one order'); return; }
    setBillingSubmitting(true);
    try {
      const result = await api.post('/lab/checkout', {
        orderIds: selectedForBilling,
        paymentMethod: billingPaymentMethod,
      });
      alert(`Invoice created: AED ${Number(result.totalAmount).toFixed(2)} for ${result.orderCount} orders`);
      setSelectedForBilling([]);
      loadBillingOrders();
    } catch (err) {
      alert(err.message || 'Checkout failed');
    } finally {
      setBillingSubmitting(false);
    }
  };

  const billingTotal = billingOrders
    .filter((o) => selectedForBilling.includes(o.id))
    .reduce((sum, o) => sum + (o.tests || []).reduce((s, t) => s + Number(t.test?.price || 0), 0), 0);

  const handleSaveResults = useCallback((updated) => {
    loadOrders();
    loadStats();
  }, [loadOrders, loadStats]);

  const tabs = [
    { key: 'queue', label: t('lab.tab.queue') },
    { key: 'catalog', label: t('lab.tab.catalog') },
    { key: 'panels', label: t('lab.tab.panels') },
    { key: 'reports', label: t('lab.tab.reports') },
    { key: 'billing', label: 'Billing' },
  ];

  const filterOptions = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('lab.title')}</h1>
          <p className="text-body text-slate">{t('lab.description')}</p>
        </div>
        {activeTab === 'queue' && (
          <Button onClick={() => setShowNewRequest(true)}>{t('lab.requestTest')}</Button>
        )}
      </div>

      <div className="flex gap-1 bg-bone p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
              ${activeTab === tab.key ? 'bg-paper text-obsidian shadow-sm' : 'text-graphite hover:text-obsidian'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent>
                  <p className="text-caption text-slate">{t('lab.statsPending')}</p>
                  <p className="text-heading font-medium text-obsidian">{stats.pending || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-slate">{t('lab.statsInProgress')}</p>
                  <p className="text-heading font-medium text-obsidian">{stats.inProgress || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-slate">{t('lab.statsToday')}</p>
                  <p className="text-heading font-medium text-obsidian">{stats.completedToday || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-caption text-slate">{t('lab.statsCatalog')}</p>
                  <p className="text-heading font-medium text-obsidian">{stats.catalogCount || 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((f) => (
              <button
                key={f}
                className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-colors touch-target
                  ${statusFilter === f ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'ALL' ? t('lab.filterAll') : t('lab.filter' + f.charAt(0) + f.slice(1).toLowerCase())}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-caption text-slate">{t('common.loading')}</p>
          ) : (
            <Table
              columns={[
                { key: 'status', label: t('lab.status'), render: (r) => (
                  <Badge variant={statusBadge[r.status]}>{t('lab.' + r.status.toLowerCase())}</Badge>
                )},
                { key: 'patient', label: t('lab.patient'), render: (r) => r.patient?.fullName || '-' },
                { key: 'priority', label: t('lab.priority'), render: (r) => (
                  <Badge variant={priorityBadge[r.priority]}>{r.priority}</Badge>
                )},
                { key: 'tests', label: t('lab.testsCount'), render: (r) => r.tests?.length || 0 },
                { key: 'assignedTo', label: t('lab.assignedTo'), render: (r) => r.assignedTo || '-' },
                { key: 'date', label: t('lab.date'), render: (r) => new Date(r.createdAt).toLocaleDateString() },
                { key: 'actions', label: t('lab.actions'), render: (r) => (
                  <div className="flex gap-1">
                    <button onClick={() => handleViewDetail(r)} className="text-lilac-bloom hover:underline text-caption px-1">
                      {t(r.status === 'COMPLETED' ? 'lab.viewReport' : 'lab.enterResults')}
                    </button>
                    {r.status === 'PENDING' && (
                      <button onClick={() => handleClaim(r.id)} className="text-green-600 hover:underline text-caption px-1">
                        {t('lab.claim')}
                      </button>
                    )}
                    {r.status === 'IN_PROGRESS' && (
                      <>
                        <button onClick={() => handleComplete(r.id)} className="text-green-600 hover:underline text-caption px-1">
                          {t('lab.markCompleted')}
                        </button>
                        <button onClick={() => handleUnclaim(r.id)} className="text-slate hover:underline text-caption px-1">
                          {t('lab.unclaim')}
                        </button>
                      </>
                    )}
                    {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                      <button onClick={() => handleCancel(r.id)} className="text-red-500 hover:underline text-caption px-1">
                        {t('lab.cancelOrder')}
                      </button>
                    )}
                  </div>
                )},
              ]}
              data={orders}
              onRowClick={handleViewDetail}
            />
          )}
        </div>
      )}

      {activeTab === 'catalog' && (
        <CatalogManager onRefresh={loadStats} />
      )}

      {activeTab === 'panels' && (
        <Card>
          <CardContent>
            <p className="text-body text-slate">{t('common.noData')}</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card>
          <CardContent>
            <p className="text-body text-slate">{t('common.noData')}</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-4">
          {selectedForBilling.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-body font-semibold text-obsidian">
                      {selectedForBilling.length} orders selected
                    </p>
                    <p className="text-heading-sm font-bold text-obsidian">AED {billingTotal.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={billingPaymentMethod} onChange={(e) => setBillingPaymentMethod(e.target.value)}
                      className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="INSURANCE">INSURANCE</option>
                      <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    </select>
                    <Button variant="primary" onClick={handleBillingCheckout} disabled={billingSubmitting}>
                      {billingSubmitting ? 'Processing...' : 'Create Invoice'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Table
            columns={[
              { key: 'select', header: '', render: (r) => (
                <input type="checkbox" checked={selectedForBilling.includes(r.id)} onChange={() => toggleBillingOrder(r.id)}
                  className="accent-lilac-bloom" />
              )},
              { key: 'patient', header: 'Patient', render: (r) => r.patient?.fullName || '-' },
              { key: 'tests', header: 'Tests', render: (r) => (r.tests || []).map((t) => t.test?.name).join(', ') || '-' },
              { key: 'total', header: 'Total', render: (r) => {
                const total = (r.tests || []).reduce((s, t) => s + Number(t.test?.price || 0), 0);
                return <span className="font-semibold">AED {total.toFixed(2)}</span>;
              }},
              { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
            ]}
            data={billingOrders}
          />
          {billingOrders.length === 0 && (
            <p className="text-body text-slate text-center py-8">No completed orders to bill</p>
          )}
        </div>
      )}

      {showDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          open={showDetail}
          onClose={() => { setShowDetail(false); setSelectedOrder(null); }}
          onSave={handleSaveResults}
        />
      )}

      <NewRequestModal
        open={showNewRequest}
        onClose={() => setShowNewRequest(false)}
        onCreated={() => { loadOrders(); loadStats(); }}
      />
    </div>
  );
}
