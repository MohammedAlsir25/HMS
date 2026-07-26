import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { usePatientVolume, usePatientDemographics } from '../../hooks/queries/useReports';

const COLORS = ['bg-lilac-bloom', 'bg-green-400', 'bg-amber-400', 'bg-purple-400', 'bg-sky-400'];

function Bar({ value, max, label, color = 'bg-lilac-bloom' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-slate w-28 shrink-0 truncate text-right">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-bone overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-caption font-medium text-obsidian w-12 shrink-0 text-right">{value}</span>
    </div>
  );
}

function PieSegment({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full ${color} shrink-0`} />
      <span className="text-caption text-slate flex-1">{label}</span>
      <span className="text-caption font-medium text-obsidian">{value} ({pct.toFixed(0)}%)</span>
    </div>
  );
}

const clinicColumns = [
  { key: 'clinic', label: 'Clinic' },
  { key: 'count', label: 'Visits', render: (r) => <span className="font-semibold">{r.count}</span> },
];

export default function PatientReport({ dateParams }) {
  const { data, isLoading, error } = usePatientVolume(dateParams);
  const { data: demographics, isLoading: demoLoading } = usePatientDemographics();

  if (isLoading || demoLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="text-center py-5"><div className="h-8 bg-bone rounded animate-pulse" /><div className="h-4 bg-bone rounded animate-pulse mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-red-500">{error.message || 'Failed to load patient data'}</p>
      </CardContent></Card>
    );
  }

  if (!data || !data.volumeByDate?.length) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No patient data for selected period</p>
      </CardContent></Card>
    );
  }

  const daily = data.volumeByDate || [];
  const clinics = data.byClinic || [];

  const totalNew = daily.reduce((s, d) => s + (d.newPatients || 0), 0);
  const totalReturning = daily.reduce((s, d) => s + (d.returningPatients || 0), 0);
  const totalPatients = totalNew + totalReturning;

  const dailyMax = Math.max(...daily.map((d) => (d.newPatients || 0) + (d.returningPatients || 0)), 1);

  const genderDist = demographics?.byGender || [];
  const ageGroups = demographics?.byAgeGroup || [];
  const totalGender = genderDist.reduce((sum, g) => sum + (g.count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{totalPatients}</p>
            <p className="text-caption text-slate">Total Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{totalNew}</p>
            <p className="text-caption text-slate">New Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-blue-600">{totalReturning}</p>
            <p className="text-caption text-slate">Returning Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{clinics.length}</p>
            <p className="text-caption text-slate">Active Clinics</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Patient Volume by Day</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
          {daily.map((d) => {
            const total = (d.newPatients || 0) + (d.returningPatients || 0);
            return (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-caption text-slate w-16 shrink-0">{new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div className="flex-1 flex h-4 rounded-full bg-bone overflow-hidden">
                  <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${(d.newPatients || 0) / dailyMax * 100}%` }} />
                  <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${(d.returningPatients || 0) / dailyMax * 100}%` }} />
                </div>
                <span className="text-caption font-medium text-obsidian w-20 text-right">{d.newPatients || 0}N / {d.returningPatients || 0}R</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Clinic Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table columns={clinicColumns} data={clinics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Demographics</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {genderDist.length > 0 && (
              <div>
                <p className="text-caption font-medium text-obsidian mb-2">Gender Distribution</p>
                <div className="space-y-2">
                  {genderDist.map((g, i) => (
                    <PieSegment key={g.gender || i} label={g.gender || 'Unknown'} value={g.count || 0} total={totalGender} color={COLORS[i % COLORS.length]} />
                  ))}
                </div>
              </div>
            )}

            {ageGroups.length > 0 && (
              <div>
                <p className="text-caption font-medium text-obsidian mb-2">Age Groups</p>
                <div className="space-y-2">
                  {ageGroups.map((ag, i) => (
                    <Bar key={ag.group || i} label={ag.group || 'Unknown'} value={ag.count || 0} max={Math.max(...ageGroups.map((a) => a.count || 0), 1)} color={COLORS[i % COLORS.length]} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
