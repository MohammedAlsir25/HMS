import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import ClinicDashboardShell from '../../components/clinic/ClinicDashboardShell';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import ImageViewer from '../../components/imaging/ImageViewer';
import { notifyError } from '../../utils/notify';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import UpcomingFollowUpsSection from './UpcomingFollowUpsSection';

const SCAN_TYPE_LABELS = { A_SCAN: 'A-Scan', B_SCAN: 'B-Scan', OTT: 'OTT Scan', BIOMETRY: 'Biometry/Pachymetry' };
const LATERALITY_LABELS = { OD: 'Right (OD)', OS: 'Left (OS)', OU: 'Both (OU)' };

function useImagingOrders(clinicSlug, statusFilter) {
  return useQuery({
    queryKey: ['imaging-orders', clinicSlug, statusFilter],
    queryFn: () => {
      let url = `/imaging?clinicSlug=${clinicSlug}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      return api.get(url).then(r => r.data || r);
    },
    refetchInterval: 15000,
  });
}

function filterOrders(orders, status) {
  return (orders || []).filter(o => o.status === status);
}

function OrderCard({ order, onSelect, isSelected }) {
  return (
    <button
      onClick={() => onSelect(order)}
      className={`w-full text-left rounded-xl border p-4 transition-colors touch-target
        ${isSelected ? 'border-lilac-bloom bg-lilac-bloom/5' : 'border-silver bg-paper hover:border-lilac-bloom/50'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-body font-semibold text-obsidian">{order.patient?.fullName || 'Unknown'}</p>
          <p className="text-caption text-slate">{order.patient?.mrn}</p>
        </div>
        <Badge variant="info">{SCAN_TYPE_LABELS[order.scanType] || order.scanType}</Badge>
      </div>
      <div className="mt-2 text-caption text-slate space-y-0.5">
        {order.laterality && <p>Eye: {LATERALITY_LABELS[order.laterality] || order.laterality}</p>}
        {order.requestedByClinic && <p>From: {order.requestedByClinic.name}</p>}
        {order.clinicalInfo && <p className="truncate">Info: {order.clinicalInfo}</p>}
      </div>
      {order.status === 'COMPLETED' && (
        <div className="mt-2 flex gap-2">
          {!order.dismissed && <Badge variant="success">Completed</Badge>}
        </div>
      )}
    </button>
  );
}

function FileThumbnail({ file }) {
  const [signedUrl, setSignedUrl] = useState(null);
  useEffect(() => {
    if (file.mimeType?.startsWith('image/')) {
      api.get(`/imaging/files/${file.id}/download`).then(res => {
        const data = res.data || res;
        setSignedUrl(data.signedUrl);
      }).catch(() => console.warn('Failed to load image thumbnail'));
    }
  }, [file.id, file.mimeType]);
  return (
    <div className="relative group">
      {file.mimeType?.startsWith('image/') && signedUrl ? (
        <img src={signedUrl} alt={file.originalName} className="w-full h-20 object-cover rounded-lg border border-silver" />
      ) : file.mimeType?.startsWith('image/') && !signedUrl ? (
        <div className="w-full h-20 flex items-center justify-center bg-bone rounded-lg border border-silver text-caption text-slate animate-pulse">Loading...</div>
      ) : (
        <div className="w-full h-20 flex items-center justify-center bg-bone rounded-lg border border-silver text-caption text-slate">
          {file.originalName}
        </div>
      )}
      <p className="text-caption text-slate truncate mt-1">{file.originalName}</p>
    </div>
  );
}

function ImagingDetailPanel({ order, onRefresh }) {
  const queryClient = useQueryClient();
  const [findings, setFindings] = useState(order?.findings || '');
  const [impression, setImpression] = useState(order?.impression || '');
  const [uploading, setUploading] = useState(false);
  const [printHtml, setPrintHtml] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileIndex, setViewerFileIndex] = useState(0);
  const [signedUrls, setSignedUrls] = useState({});

  useEffect(() => {
    if (order) {
      setFindings(order.findings || '');
      setImpression(order.impression || '');
      setPrintHtml(null);
    }
  }, [order?.id]);

  const startMutation = useMutation({
    mutationFn: () => api.post(`/imaging/${order.id}/start`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['imaging-orders'] }); onRefresh(); },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/imaging/${order.id}/complete`, { findings, impression }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['imaging-orders'] });
      const data = res.data || res;
      if (data.printData) {
        setPrintHtml(data.printData.htmlPrint);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(data.printData.htmlPrint);
          win.document.close();
          win.print();
        }
      }
      onRefresh();
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => api.post(`/imaging/${order.id}/dismiss`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['imaging-orders'] }); onRefresh(); },
  });

  const fetchPrintDataMutation = useMutation({
    mutationFn: () => api.get(`/imaging/${order.id}`),
    onSuccess: (res) => {
      const data = res.data || res;
      if (data.clinicalRecordId) {
        api.get(`/clinics/imaging/print-report/${data.clinicalRecordId}`).then(r => {
          const pd = r.data || r;
          if (pd.htmlPrint) {
            setPrintHtml(pd.htmlPrint);
            const win = window.open('', '_blank');
            if (win) {
              win.document.write(pd.htmlPrint);
              win.document.close();
              win.print();
            }
          }
        }).catch((err) => notifyError('Failed to load print report: ' + err.message));
      }
    },
  });

  const handleUpload = useCallback(async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of files) formData.append('files', f);
      await api.post(`/imaging/${order.id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      queryClient.invalidateQueries({ queryKey: ['imaging-orders'] });
      onRefresh();
    } catch (err) { notifyError('Upload failed: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  }, [order?.id, queryClient, onRefresh]);

  const openViewer = useCallback(async (fileId, index) => {
    setViewerFileIndex(index);
    setViewerOpen(true);
    const imageFiles = (order.files || []).filter(f => f.mimeType?.startsWith('image/'));
    const toFetch = imageFiles.filter(f => !signedUrls[f.id]);
    if (toFetch.length > 0) {
      const results = await Promise.allSettled(
        toFetch.map(f => api.get(`/imaging/files/${f.id}/download`).then(r => r.data || r))
      );
      const updates = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') updates[toFetch[i].id] = r.value.signedUrl;
      });
      setSignedUrls(prev => ({ ...prev, ...updates }));
    }
  }, [order?.files, signedUrls]);

  const imageFiles = (order?.files || []).filter(f => f.mimeType?.startsWith('image/'));

  if (!order) {
    return (
      <Card>
        <CardContent><p className="text-body text-slate text-center py-8">Select an order from the queue</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Referral Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-body">
            <div>
              <p className="text-caption text-slate">Patient</p>
              <p className="font-medium text-obsidian">{order.patient?.fullName}</p>
              <p className="text-caption text-slate">{order.patient?.mrn}</p>
            </div>
            <div>
              <p className="text-caption text-slate">Referring Clinic</p>
              <p className="font-medium text-obsidian">{order.requestedByClinic?.name}</p>
            </div>
            <div>
              <p className="text-caption text-slate">Scan Type</p>
              <Badge variant="info">{SCAN_TYPE_LABELS[order.scanType] || order.scanType}</Badge>
            </div>
            <div>
              <p className="text-caption text-slate">Laterality</p>
              <p className="font-medium text-obsidian">{LATERALITY_LABELS[order.laterality] || order.laterality || '-'}</p>
            </div>
          </div>
          {order.clinicalInfo && (
            <div className="mt-3">
              <p className="text-caption text-slate">Clinical Info</p>
              <p className="text-body text-obsidian bg-bone rounded-lg p-3 mt-1">{order.clinicalInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {order.status !== 'DISMISSED' && (
        <Card>
          <CardHeader><CardTitle>Image Upload</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/dicom,.dcm" onChange={handleUpload}
                className="block w-full text-sm text-slate file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-lilac-bloom/10 file:text-lilac-bloom hover:file:bg-lilac-bloom/20"
                disabled={uploading} />
              {uploading && <span className="text-caption text-slate">Uploading...</span>}
            </div>
            {order.files?.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {order.files.map((f, idx) => (
                  f.mimeType?.startsWith('image/') ? (
                    <button key={f.id} onClick={() => openViewer(f.id, idx)}
                      className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom rounded-lg">
                      <FileThumbnail file={f} />
                    </button>
                  ) : f.mimeType === 'application/pdf' ? (
                    <a key={f.id} href={`/imaging/files/${f.id}/download`} target="_blank" rel="noopener noreferrer"
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom rounded-lg">
                      <FileThumbnail file={f} />
                    </a>
                  ) : (
                    <FileThumbnail key={f.id} file={f} />
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {order.status !== 'DISMISSED' && order.status !== 'COMPLETED' && (
        <>
          <Card>
            <CardHeader><CardTitle>Findings</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Enter scan findings..."
                className="w-full min-h-[120px] px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Impression</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                placeholder="Enter clinical impression..."
                className="w-full min-h-[80px] px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {order.status === 'PENDING' && (
              <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending}>Start Scan</Button>
            )}
            {order.status === 'IN_PROGRESS' && (
              <Button onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>Send Back</Button>
            )}
            {(order.status === 'COMPLETED') && (
              <>
                <Button onClick={() => fetchPrintDataMutation.mutate()} variant="secondary" loading={fetchPrintDataMutation.isPending}>Print Report</Button>
                <Button onClick={() => dismissMutation.mutate()} variant="ghost" loading={dismissMutation.isPending}>Dismiss</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal open={viewerOpen} onClose={() => setViewerOpen(false)} title="Image Viewer" className="max-w-4xl">
        {imageFiles.length > 0 && (
          <div className="flex gap-3" style={{ minHeight: 420 }}>
            {imageFiles.length > 1 && (
              <div className="w-20 flex flex-col gap-1 overflow-y-auto shrink-0">
                {imageFiles.map((f, idx) => (
                  <button key={f.id} onClick={() => setViewerFileIndex(idx)}
                    className={`w-full h-14 rounded-lg border overflow-hidden transition-colors ${idx === viewerFileIndex ? 'border-lilac-bloom' : 'border-silver hover:border-lilac-bloom/50'}`}>
                    {signedUrls[f.id] ? (
                      <img src={signedUrls[f.id]} alt={f.originalName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bone text-[10px] text-slate px-1">{f.originalName}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-0">
              {signedUrls[imageFiles[viewerFileIndex]?.id] ? (
                <ImageViewer
                  src={signedUrls[imageFiles[viewerFileIndex].id]}
                  alt={imageFiles[viewerFileIndex]?.originalName || ''}
                  className="h-[420px]"
                />
              ) : (
                <div className="flex items-center justify-center h-[420px] bg-bone rounded-xl border border-silver">
                  <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ImagingHistoryPanel() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const dismissedQuery = useQuery({
    queryKey: ['imaging-history', search, page],
    queryFn: () => {
      let url = `/imaging?clinicSlug=imaging&status=DISMISSED`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return api.get(url).then(r => r.data || r);
    },
  });

  const orders = dismissedQuery.data || [];
  const totalPages = Math.ceil(orders.length / 20);
  const pagedOrders = orders.slice((page - 1) * 20, page * 20);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Imaging History</CardTitle>
          {orders.length > 0 && <span className="text-caption text-slate">{orders.length} records</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search Patient" placeholder="Name or MRN..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {dismissedQuery.isLoading ? (
          <p className="text-body text-slate text-center py-8">Loading...</p>
        ) : pagedOrders.length === 0 ? (
          <p className="text-body text-slate text-center py-8">No history records</p>
        ) : (
          <>
            <div className="space-y-2">
              {pagedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-bone rounded-lg">
                  <div>
                    <p className="text-body font-medium text-obsidian">{order.patient?.fullName || 'Unknown'}</p>
                    <p className="text-caption text-slate">
                      {order.patient?.mrn} · {SCAN_TYPE_LABELS[order.scanType] || order.scanType}
                      {order.laterality ? ` · ${LATERALITY_LABELS[order.laterality] || order.laterality}` : ''}
                      {order.requestedByClinic ? ` · From: ${order.requestedByClinic.name}` : ''}
                    </p>
                  </div>
                  <Badge variant="success">Dismissed</Badge>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-caption text-slate">Page {page} of {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImagingDashboard() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [queueKey, setQueueKey] = useState(0);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const pendingOrders = useImagingOrders('imaging', 'PENDING');
  const inProgressOrders = useImagingOrders('imaging', 'IN_PROGRESS');
  const completedOrders = useImagingOrders('imaging', 'COMPLETED');

  const pendingList = filterOrders(pendingOrders.data, 'PENDING');
  const inProgressList = filterOrders(inProgressOrders.data, 'IN_PROGRESS');
  const completedList = filterOrders(completedOrders.data, 'COMPLETED');

  const handleSelectOrder = useCallback((order) => {
    setActiveOrder(order);
  }, []);

  const handleRefresh = useCallback(() => {
    setQueueKey(k => k + 1);
  }, []);

  const queueContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="flex gap-1 mb-4 border-b border-silver">
          {[
            { key: 'pending', label: 'Pending', count: pendingList.length },
            { key: 'in-progress', label: 'In Progress', count: inProgressList.length },
            { key: 'completed', label: 'Completed', count: completedList.length },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors touch-target
                ${activeTab === tab.key ? 'border-lilac-bloom text-lilac-bloom' : 'border-transparent text-slate hover:text-obsidian'}`}
            >
              {tab.label}
              <span className="text-caption bg-bone px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {(activeTab === 'pending' ? pendingList : activeTab === 'in-progress' ? inProgressList : completedList).map(order => (
            <OrderCard key={order.id} order={order} onSelect={handleSelectOrder} isSelected={activeOrder?.id === order.id} />
          ))}
          {activeTab === 'pending' && pendingList.length === 0 && (
            <p className="text-body text-slate text-center py-8">No pending orders</p>
          )}
          {activeTab === 'in-progress' && inProgressList.length === 0 && (
            <p className="text-body text-slate text-center py-8">No orders in progress</p>
          )}
          {activeTab === 'completed' && completedList.length === 0 && (
            <p className="text-body text-slate text-center py-8">No completed orders</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <ImagingDetailPanel order={activeOrder} onRefresh={handleRefresh} />
      </div>
    </div>
  );

  return (
    <ClinicDashboardShell
      title="Medical Imaging"
      subtitle="A-Scan · B-Scan · OTT · Biometry/Pachymetry"
      historyPanel={<ImagingHistoryPanel />}
    >
      <div key={queueKey}>
        {!activeOrder && <UpcomingFollowUpsSection clinicSlug="imaging" />}
        {queueContent}
        {activeOrder && (
          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowFollowUpModal(true)}>
              Schedule Follow-Up
            </Button>
          </div>
        )}
      </div>

      <ScheduleFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        clinicSlug="imaging"
        patientId={activeOrder?.patient?.id}
        patientName={activeOrder?.patient?.fullName}
        onScheduled={() => setShowFollowUpModal(false)}
      />
    </ClinicDashboardShell>
  );
}
