import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';

const TABS = [
  { key: 'requisitions', label: 'Requisitions' },
  { key: 'purchaseOrders', label: 'Purchase Orders' },
  { key: 'approvals', label: 'Approval Queue' },
  { key: 'assets', label: 'Fixed Assets' },
  { key: 'costCenters', label: 'Cost Centers' },
];

const statusColors = {
  DRAFT: 'bg-bone text-graphite',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-blue-100 text-blue-800',
  RECEIVED_IN_FULL: 'bg-green-100 text-green-800',
  CLOSED: 'bg-silver text-graphite',
};

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState('requisitions');
  const user = useAuthStore((s) => s.user);
  const canApprove = user?.permissions?.includes('approval:write');
  const canWrite = user?.permissions?.includes('purchase:write');
  const canReadAssets = user?.permissions?.includes('asset:read');
  const canWriteAssets = user?.permissions?.includes('asset:write');

  const [requisitions, setRequisitions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [ccForm, setCcForm] = useState({ name: '', code: '', departmentId: '' });
  const [editingCc, setEditingCc] = useState(null);

  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  const [reqForm, setReqForm] = useState({ departmentId: '', notes: '', items: [] });
  const [poForm, setPoForm] = useState({ departmentType: 'pharmacy', expenseType: 'COGS', supplierId: '', costCenterId: '', notes: '', items: [] });
  const [assetForm, setAssetForm] = useState({ name: '', assetType: 'EQUIPMENT', acquisitionCost: '', usefulLifeYears: '5', purchaseDate: '', location: '', serialNumber: '', notes: '' });

  const [mutationError, setMutationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const fetchRequisitions = useCallback(async () => {
    try { const data = await api.get(`/procurement/requisitions${search ? `?q=${encodeURIComponent(search)}` : ''}`); setRequisitions(data); setPageError(''); } catch (err) { setRequisitions([]); setPageError(err.message || 'Failed to load requisitions'); }
  }, [search]);

  const fetchPurchaseOrders = useCallback(async () => {
    try { const data = await api.get(`/procurement/purchase-orders${search ? `?q=${encodeURIComponent(search)}` : ''}`); setPurchaseOrders(data); setPageError(''); } catch (err) { setPurchaseOrders([]); setPageError(err.message || 'Failed to load purchase orders'); }
  }, [search]);

  const fetchPendingApprovals = useCallback(async () => {
    try { const data = await api.get('/procurement/purchase-orders/pending-approval'); setPendingApprovals(data); setPageError(''); } catch (err) { setPendingApprovals([]); setPageError(err.message || 'Failed to load approvals'); }
  }, []);

  const fetchFixedAssets = useCallback(async () => {
    try { const data = await api.get('/procurement/assets'); setFixedAssets(data); setPageError(''); } catch (err) { setFixedAssets([]); setPageError(err.message || 'Failed to load assets'); }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try { const data = await api.get('/pos/suppliers'); setSuppliers(data); setPageError(''); } catch (err) { setSuppliers([]); setPageError(err.message || 'Failed to load suppliers'); }
  }, []);

  const fetchCostCenters = useCallback(async () => {
    try { const data = await api.get('/procurement/cost-centers'); setCostCenters(data); setPageError(''); } catch (err) { setCostCenters([]); setPageError(err.message || 'Failed to load cost centers'); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try { const data = await api.get('/departments'); setDepartments(data); setPageError(''); } catch (err) { setDepartments([]); setPageError(err.message || 'Failed to load departments'); }
  }, []);

  const fetchInventoryItems = useCallback(async () => {
    try { const data = await api.get('/pos/pharmacy/items'); setInventoryItems(data); setPageError(''); } catch (err) { setInventoryItems([]); setPageError(err.message || 'Failed to load inventory items'); }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPageError('');
    Promise.all([
      fetchSuppliers(),
      fetchCostCenters(),
      fetchDepartments(),
      fetchInventoryItems(),
    ]).finally(() => setLoading(false));
  }, [fetchSuppliers, fetchCostCenters, fetchDepartments, fetchInventoryItems]);

  useEffect(() => {
    if (activeTab === 'requisitions') { setLoading(true); fetchRequisitions().finally(() => setLoading(false)); }
  }, [activeTab, fetchRequisitions]);
  useEffect(() => {
    if (activeTab === 'purchaseOrders') { setLoading(true); fetchPurchaseOrders().finally(() => setLoading(false)); }
  }, [activeTab, fetchPurchaseOrders]);
  useEffect(() => {
    if (activeTab === 'approvals') { setLoading(true); fetchPendingApprovals().finally(() => setLoading(false)); }
  }, [activeTab, fetchPendingApprovals]);
  useEffect(() => {
    if (activeTab === 'assets') { setLoading(true); fetchFixedAssets().finally(() => setLoading(false)); }
  }, [activeTab, fetchFixedAssets]);
  useEffect(() => {
    if (activeTab === 'costCenters') { setLoading(true); fetchCostCenters().finally(() => setLoading(false)); }
  }, [activeTab, fetchCostCenters]);

  const handleSubmitRequisition = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMutationError('');
    try {
      const payload = {
        ...reqForm,
        items: reqForm.items.map((it) => ({
          ...it,
          itemId: it.itemId || null,
        })),
      };
      await api.post('/procurement/requisitions', payload);
      setShowRequisitionModal(false);
      setReqForm({ departmentId: '', notes: '', items: [] });
      fetchRequisitions();
    } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };

  const handleSubmitPO = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMutationError('');
    try {
      const payload = {
        ...poForm,
        items: poForm.items.map((it) => ({
          ...it,
          itemId: it.itemId || null,
        })),
      };
      await api.post('/procurement/purchase-orders', payload);
      setShowPOModal(false);
      setPoForm({ departmentType: 'pharmacy', expenseType: 'COGS', supplierId: '', costCenterId: '', notes: '', items: [] });
      fetchPurchaseOrders();
    } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };

  const handleSubmitAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMutationError('');
    try {
      await api.post('/procurement/assets', assetForm);
      setShowAssetModal(false);
      setAssetForm({ name: '', assetType: 'EQUIPMENT', acquisitionCost: '', usefulLifeYears: '5', purchaseDate: '', location: '', serialNumber: '', notes: '' });
      fetchFixedAssets();
    } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    setSubmitting(true);
    setMutationError('');
    try { await api.post(`/procurement/purchase-orders/${id}/approve`); fetchPendingApprovals(); fetchPurchaseOrders(); } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };
  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) { setSubmitting(false); return; }
    setSubmitting(true);
    setMutationError('');
    try { await api.post(`/procurement/purchase-orders/${id}/reject`, { rejectionReason: reason }); fetchPendingApprovals(); fetchPurchaseOrders(); } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };
  const handleSubmit = async (id) => {
    setSubmitting(true);
    setMutationError('');
    try { await api.post(`/procurement/purchase-orders/${id}/submit`); fetchPurchaseOrders(); fetchPendingApprovals(); } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };
  const handleReceive = async (id) => {
    setSubmitting(true);
    setMutationError('');
    try { await api.post(`/procurement/purchase-orders/${id}/receive`, { receivedItems: [] }); fetchPurchaseOrders(); } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };
  const handleDepreciate = async (id) => {
    setSubmitting(true);
    setMutationError('');
    try { await api.put(`/procurement/assets/${id}/depreciate`); fetchFixedAssets(); } catch (err) { setMutationError(err.message); }
    setSubmitting(false);
  };

  const addReqLine = () => setReqForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: 1, itemId: '' }] }));
  const updateReqLine = (idx, field, value) => {
    const items = [...reqForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setReqForm((f) => ({ ...f, items }));
  };
  const removeReqLine = (idx) => setReqForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const addPOLine = () => setPoForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitCost: 0, itemId: '' }] }));
  const updatePOLine = (idx, field, value) => {
    const items = [...poForm.items];
    items[idx] = { ...items[idx], [field]: value };
    setPoForm((f) => ({ ...f, items }));
  };
  const removePOLine = (idx) => setPoForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const poTotal = poForm.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitCost)), 0);

  const colsRequisitions = [
    { key: 'requestNumber', header: 'Ref', render: (r) => r.requestNumber || r.id.slice(0, 8) },
    { key: 'status', header: 'Status', render: (r) => <Badge className={statusColors[r.status]}>{r.status}</Badge> },
    { key: 'department', header: 'Department', render: (r) => r.department?.name || '-' },
    { key: 'requestedBy', header: 'Requested By', render: (r) => r.requestedBy?.fullName || '-' },
    { key: 'items', header: 'Items', render: (r) => r.items?.length || 0 },
    { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const colsPOs = [
    { key: 'orderNumber', header: 'Ref', render: (p) => p.orderNumber || p.id.slice(0, 8) },
    { key: 'status', header: 'Status', render: (p) => <Badge className={statusColors[p.status]}>{p.status}</Badge> },
    { key: 'supplier', header: 'Supplier', render: (p) => p.supplier?.name || '-' },
    { key: 'expenseType', header: 'Type', render: (p) => <Badge>{p.expenseType}</Badge> },
    { key: 'invoiceTotal', header: 'Total', render: (p) => `SDG ${Number(p.invoiceTotal).toLocaleString()}` },
    { key: 'paymentStatus', header: 'Payment', render: (p) => p.paymentStatus === 'Paid' ? <Badge variant="success">Paid</Badge> : <Badge>{p.paymentStatus}</Badge> },
    { key: 'actions', header: 'Actions', render: (p) => (
      <div className="flex gap-1">
        {p.status === 'DRAFT' && <Button size="sm" loading={submitting} onClick={() => handleSubmit(p.id)}>Submit</Button>}
        {p.status === 'APPROVED' && <Button size="sm" loading={submitting} onClick={() => handleReceive(p.id)}>Receive</Button>}
      </div>
    )},
  ];

  const colsApprovals = [
    { key: 'orderNumber', header: 'Ref', render: (p) => p.orderNumber || p.id.slice(0, 8) },
    { key: 'supplier', header: 'Supplier', render: (p) => p.supplier?.name || '-' },
    { key: 'expenseType', header: 'Type', render: (p) => <Badge>{p.expenseType}</Badge> },
    { key: 'invoiceTotal', header: 'Total', render: (p) => `SDG ${Number(p.invoiceTotal).toLocaleString()}` },
    { key: 'approvalTier', header: 'Tier', render: (p) => p.approvalTier ? `Tier ${p.approvalTier}` : '-' },
    { key: 'createdBy', header: 'Requested By', render: (p) => p.createdBy?.fullName || '-' },
    { key: 'createdAt', header: 'Date', render: (p) => new Date(p.createdAt).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: (p) => canApprove ? (
      <div className="flex gap-1">
        <Button size="sm" variant="primary" loading={submitting} onClick={() => handleApprove(p.id)}>Approve</Button>
        <Button size="sm" variant="danger" loading={submitting} onClick={() => handleReject(p.id)}>Reject</Button>
      </div>
    ) : null },
  ];

  const colsAssets = [
    { key: 'name', header: 'Name' },
    { key: 'assetType', header: 'Type', render: (a) => <Badge>{a.assetType}</Badge> },
    { key: 'totalCost', header: 'Total Cost', render: (a) => `SDG ${Number(a.totalCost).toLocaleString()}` },
    { key: 'bookValue', header: 'Book Value', render: (a) => `SDG ${Number(a.bookValue).toLocaleString()}` },
    { key: 'monthlyDepreciation', header: 'Monthly Dep.', render: (a) => `SDG ${Number(a.monthlyDepreciation).toFixed(2)}` },
    { key: 'usefulLifeYears', header: 'Life (yrs)' },
    { key: 'isActive', header: 'Active', render: (a) => a.isActive ? <Badge variant="success">Yes</Badge> : <Badge>No</Badge> },
    { key: 'actions', header: 'Actions', render: (a) => a.isActive ? (
      <Button size="sm" variant="ghost" loading={submitting} onClick={() => handleDepreciate(a.id)}>Depreciate</Button>
    ) : null },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Procurement</h1>
          <p className="text-body text-slate mt-1">Manage requisitions, purchase orders, approvals & fixed assets</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-slate/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Procurement</h1>
          <p className="text-body text-slate mt-1">Manage requisitions, purchase orders, approvals & fixed assets</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-8 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{pageError}</p>
          <button onClick={() => { setPageError(''); setLoading(true); Promise.all([fetchSuppliers(), fetchCostCenters(), fetchDepartments(), fetchInventoryItems()]).finally(() => setLoading(false)); }} className="mt-3 px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mutationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xl leading-none touch-target">&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Procurement</h1>
          <p className="text-body text-slate mt-1">Manage requisitions, purchase orders, approvals & fixed assets</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-silver">
        {TABS.map((t) => (
          <button key={t.key} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === t.key ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xs">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {activeTab === 'requisitions' && canWrite && <Button onClick={() => setShowRequisitionModal(true)}>+ New Requisition</Button>}
        {activeTab === 'purchaseOrders' && canWrite && <Button onClick={async () => { await fetchSuppliers(); await fetchCostCenters(); setShowPOModal(true); }}>+ New PO</Button>}
        {activeTab === 'assets' && canWriteAssets && <Button onClick={() => setShowAssetModal(true)}>+ New Asset</Button>}
      </div>

      {activeTab === 'requisitions' && (
        <Card>
          <CardHeader><CardTitle>Requisitions ({requisitions.length})</CardTitle></CardHeader>
          <CardContent><Table columns={colsRequisitions} data={requisitions} /></CardContent>
        </Card>
      )}

      {activeTab === 'purchaseOrders' && (
        <Card>
          <CardHeader><CardTitle>Purchase Orders ({purchaseOrders.length})</CardTitle></CardHeader>
          <CardContent><Table columns={colsPOs} data={purchaseOrders} /></CardContent>
        </Card>
      )}

      {activeTab === 'approvals' && (
        <Card>
          <CardHeader><CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle></CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No pending approvals</p>
            ) : (
              <Table columns={colsApprovals} data={pendingApprovals} />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'assets' && (
        <Card>
          <CardHeader><CardTitle>Fixed Assets ({fixedAssets.length})</CardTitle></CardHeader>
          <CardContent><Table columns={colsAssets} data={fixedAssets} /></CardContent>
        </Card>
      )}

      {activeTab === 'costCenters' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Cost Center</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setMutationError('');
                setSubmitting(true);
                try {
                  if (editingCc) {
                    await api.patch(`/procurement/cost-centers/${editingCc.id}`, ccForm);
                    setEditingCc(null);
                  } else {
                    await api.post('/procurement/cost-centers', ccForm);
                  }
                  setCcForm({ name: '', code: '', departmentId: '' });
                  fetchCostCenters();
                } catch (err) { setMutationError(err.message); }
                setSubmitting(false);
              }} className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-caption text-slate block mb-1">Code</label>
                  <input required value={ccForm.code} onChange={(e) => setCcForm({ ...ccForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom" placeholder="e.g. CC-001" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="text-caption text-slate block mb-1">Name</label>
                  <input required value={ccForm.name} onChange={(e) => setCcForm({ ...ccForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom" placeholder="Cost center name" />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="text-caption text-slate block mb-1">Department</label>
                  <select required value={ccForm.departmentId} onChange={(e) => setCcForm({ ...ccForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="">Select</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" loading={submitting}>{editingCc ? 'Update' : 'Add'}</Button>
                  {editingCc && <Button type="button" variant="ghost" onClick={() => { setEditingCc(null); setCcForm({ name: '', code: '', departmentId: '' }); }}>Cancel</Button>}
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cost Centers ({costCenters.length})</CardTitle></CardHeader>
            <CardContent>
              <Table columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'dept', label: 'Department', render: (r) => r.department?.name || '-' },
                { key: 'isActive', label: 'Active', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge> },
                {
                  key: 'actions', label: '',
                  render: (r) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingCc(r); setCcForm({ name: r.name, code: r.code, departmentId: r.departmentId || '' }); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={async () => {
                        if (!confirm('Delete this cost center?')) return;
                        try { await api.delete(`/procurement/cost-centers/${r.id}`); fetchCostCenters(); } catch (err) { setMutationError(err.message); }
                      }}>Delete</Button>
                    </div>
                  ),
                },
              ]} data={costCenters} />
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={showRequisitionModal} onClose={() => setShowRequisitionModal(false)} title="New Requisition">
        <form onSubmit={handleSubmitRequisition} className="space-y-4">
          <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={reqForm.departmentId} onChange={(e) => setReqForm((f) => ({ ...f, departmentId: e.target.value }))} required>
            <option value="">Select Department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Input label="Notes" value={reqForm.notes} onChange={(e) => setReqForm((f) => ({ ...f, notes: e.target.value }))} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-obsidian">Items</span>
              <Button size="sm" variant="ghost" onClick={addReqLine} type="button">+ Add Item</Button>
            </div>
            {reqForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom flex-1" value={it.itemId} onChange={(e) => updateReqLine(idx, 'itemId', e.target.value)}>
                  <option value="">Select product</option>
                  {inventoryItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateReqLine(idx, 'quantity', Number(e.target.value))} className="w-20" min="1" />
                <Button size="sm" variant="danger" onClick={() => removeReqLine(idx)} type="button">x</Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" loading={submitting}>Create Requisition</Button>
        </form>
      </Modal>

      <Modal open={showPOModal} onClose={() => setShowPOModal(false)} title="New Purchase Order" className="max-w-2xl">
        <form onSubmit={handleSubmitPO} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={poForm.departmentType} onChange={(e) => setPoForm((f) => ({ ...f, departmentType: e.target.value }))} required>
              <option value="pharmacy">Pharmacy</option>
              <option value="optics">Optics</option>
              <option value="hospital">Hospital</option>
            </select>
            <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={poForm.expenseType} onChange={(e) => setPoForm((f) => ({ ...f, expenseType: e.target.value }))} required>
              <option value="COGS">COGS</option>
              <option value="OPEX">OPEX</option>
              <option value="CAPEX">CAPEX</option>
            </select>
          </div>
          <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={poForm.supplierId} onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))} required>
            <option value="">Select Supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={poForm.costCenterId} onChange={(e) => setPoForm((f) => ({ ...f, costCenterId: e.target.value }))}>
            <option value="">Select Cost Center (optional)</option>
            {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
          <Input label="Notes" value={poForm.notes} onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-obsidian">Items</span>
              <Button size="sm" variant="ghost" onClick={addPOLine} type="button">+ Add Item</Button>
            </div>
            {poForm.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom flex-[2]" value={it.itemId} onChange={(e) => updatePOLine(idx, 'itemId', e.target.value)}>
                  <option value="">Select product</option>
                  {inventoryItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updatePOLine(idx, 'quantity', Number(e.target.value))} className="w-16" min="1" />
                <Input type="number" placeholder="Unit Cost" value={it.unitCost} onChange={(e) => updatePOLine(idx, 'unitCost', Number(e.target.value))} className="w-24" min="0" step="0.01" />
                <Button size="sm" variant="danger" onClick={() => removePOLine(idx)} type="button">x</Button>
              </div>
            ))}
            {poForm.items.length > 0 && (
              <p className="text-right text-body font-medium text-obsidian">Total: SDG {poTotal.toLocaleString()}</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={submitting}>Create Purchase Order</Button>
        </form>
      </Modal>

      <Modal open={showAssetModal} onClose={() => setShowAssetModal(false)} title="New Fixed Asset">
        <form onSubmit={handleSubmitAsset} className="space-y-4">
          <Input label="Asset Name" value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} required />
          <select className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" value={assetForm.assetType} onChange={(e) => setAssetForm((f) => ({ ...f, assetType: e.target.value }))} required>
            <option value="EQUIPMENT">Equipment</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="BUILDING">Building</option>
            <option value="FURNITURE">Furniture</option>
            <option value="COMPUTER">Computer</option>
            <option value="OTHER">Other</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Acquisition Cost (SDG)" type="number" value={assetForm.acquisitionCost} onChange={(e) => setAssetForm((f) => ({ ...f, acquisitionCost: e.target.value }))} required min="0" step="0.01" />
            <Input label="Useful Life (years)" type="number" value={assetForm.usefulLifeYears} onChange={(e) => setAssetForm((f) => ({ ...f, usefulLifeYears: e.target.value }))} required min="1" />
          </div>
          <Input label="Purchase Date" type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
          <Input label="Location" value={assetForm.location} onChange={(e) => setAssetForm((f) => ({ ...f, location: e.target.value }))} />
          <Input label="Serial Number" value={assetForm.serialNumber} onChange={(e) => setAssetForm((f) => ({ ...f, serialNumber: e.target.value }))} />
          <Button type="submit" className="w-full" loading={submitting}>Create Asset</Button>
        </form>
      </Modal>
    </div>
  );
}
