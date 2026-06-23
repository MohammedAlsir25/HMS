import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export default function FileUploader({ patientId, patientName }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const fetchFiles = async () => {
    if (!patientId) return;
    try {
      const data = await api.get(`/reception/files/${patientId}`);
      setFiles(data);
    } catch { /* empty */ }
  };

  useEffect(() => { fetchFiles(); }, [patientId]);

  const handleUpload = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of selected) formData.append('files', f);
      formData.append('patientId', patientId);
      await api.upload('/reception/files', formData);
      fetchFiles();
    } catch { /* empty */ }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!patientId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reception.testResults')} — {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <input ref={inputRef} type="file" multiple accept="application/pdf" onChange={handleUpload} className="hidden" id="file-upload" />
          <label htmlFor="file-upload">
            <Button variant="secondary" disabled={uploading} as="span" className="cursor-pointer">
              {uploading ? t('reception.uploading') : t('reception.uploadPdf')}
            </Button>
          </label>
          <p className="text-xs text-graphite mt-1">{t('reception.pdfOnly')}</p>
        </div>
        {files.length > 0 && (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded border border-silver p-2">
                <div className="truncate flex-1">
                  <p className="text-sm text-obsidian truncate">{f.originalName}</p>
                  <p className="text-xs text-graphite">{formatSize(f.size)}</p>
                </div>
                <a href={`/api/reception/files/download/${f.id}`} target="_blank" rel="noopener noreferrer">
                  <Badge variant="primary" className="cursor-pointer">{t('reception.download')}</Badge>
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
