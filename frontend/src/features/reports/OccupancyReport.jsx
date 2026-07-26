import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useOccupancyReport } from '../../hooks/queries/useReports';

function parseRate(rateStr) {
  if (typeof rateStr === 'number') return rateStr;
  if (typeof rateStr === 'string') return parseFloat(rateStr.replace('%', '')) || 0;
  return 0;
}

const wardColumns = [
  { key: 'wardName', label: 'Ward' },
  { key: 'totalBeds', label: 'Total Beds', render: (r) => r.totalBeds || 0 },
  { key: 'occupied', label: 'Occupied', render: (r) => r.occupied || 0 },
  { key: 'rate', label: 'Rate %', render: (r) => {
    const rate = parseRate(r.rate);
    return <span className={`font-semibold ${rate > 90 ? 'text-red-600' : rate > 70 ? 'text-amber-600' : 'text-green-600'}`}>{rate.toFixed(1)}%</span>;
  }},
  { key: 'avgStayDays', label: 'Avg Stay (days)', render: (r) => (r.avgStayDays || 0).toFixed(1) },
];

const trendColumns = [
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
  { key: 'rate', label: 'Occupancy %', render: (r) => <span className="font-medium">{parseRate(r.rate).toFixed(1)}%</span> },
];

const losColumns = [
  { key: 'range', label: 'Length of Stay' },
  { key: 'count', label: 'Patients', render: (r) => <span className="font-semibold">{r.count || 0}</span> },
];

export default function OccupancyReport({ dateParams }) {
  const { data, isLoading, error } = useOccupancyReport(dateParams);

  if (isLoading) {
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
        <p className="text-body text-red-500">{error.message || 'Failed to load occupancy data'}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No occupancy data available</p>
      </CardContent></Card>
    );
  }

  const rate = parseRate(data.occupancyRate);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className={`text-3xl font-bold ${rate > 90 ? 'text-red-600' : rate > 70 ? 'text-amber-600' : 'text-green-600'}`}>{rate.toFixed(1)}%</p>
            <p className="text-caption text-slate">Occupancy Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{data.totalBeds || 0}</p>
            <p className="text-caption text-slate">Total Beds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{data.occupiedBeds || 0}</p>
            <p className="text-caption text-slate">Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{data.availableBeds || 0}</p>
            <p className="text-caption text-slate">Available</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By Ward</CardTitle></CardHeader>
        <CardContent>
          <Table columns={wardColumns} data={data.byWard || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Occupancy Trend</CardTitle></CardHeader>
        <CardContent>
          <Table columns={trendColumns} data={data.trends || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Length of Stay Distribution</CardTitle></CardHeader>
        <CardContent>
          <Table columns={losColumns} data={data.lengthOfStayDistribution || []} />
        </CardContent>
      </Card>
    </div>
  );
}
