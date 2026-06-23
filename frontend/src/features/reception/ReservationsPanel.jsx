import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export default function ReservationsPanel({ clinics }) {
  const { t } = useTranslation();
  const [reservations, setReservations] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clinicFilter) params.set('clinicId', clinicFilter);
      if (searchQ.trim().length >= 2) params.set('q', searchQ.trim());
      const data = await api.get(`/reception/reservations?${params}`);
      setReservations(data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReservations(); }, []);

  const handleArrive = async (id, e) => {
    e.preventDefault();
    try {
      await api.patch(`/reception/reservations/${id}/arrive`, { priority: 5, visitType: 'NEW_VISIT' });
      fetchReservations();
    } catch { /* empty */ }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reception.reservations')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder={t('reception.searchReservation')}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>
          <select
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            className="rounded-lg border border-silver bg-white px-3 py-2 text-sm"
          >
            <option value="">{t('reception.allClinics')}</option>
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button variant="secondary" onClick={fetchReservations} size="sm">{t('common.search')}</Button>
        </div>
        {loading ? (
          <p className="text-sm text-graphite">{t('common.loading')}</p>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-graphite">{t('reception.noReservations')}</p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {reservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-silver p-3">
                <div>
                  <p className="font-medium text-obsidian">{r.patient.fullName}</p>
                  <p className="text-xs text-graphite">
                    {r.patient.mrn}{r.patient.nationalId ? ` | ${r.patient.nationalId}` : ''}
                  </p>
                  <p className="text-xs text-graphite">{r.clinic.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{t('reception.reserved')}</Badge>
                  <Button size="sm" variant="primary" onClick={(e) => handleArrive(r.id, e)}>
                    {t('reception.arrived')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
