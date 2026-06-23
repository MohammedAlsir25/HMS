import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export default function ClinicDashboardShell({
  title,
  subtitle,
  children,
  actionButtons,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{title}</h1>
          {subtitle && <p className="text-body text-slate mt-1">{subtitle}</p>}
        </div>
        {actionButtons && (
          <div className="flex gap-2 flex-wrap">{actionButtons}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export function ClinicSection({ title, className = '', children }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatCard({ label, value, trend, variant = 'default' }) {
  return (
    <div className={`card-surface p-4 flex flex-col gap-1 ${variant === 'highlight' ? 'bg-lilac-bloom/10 border-lilac-bloom' : ''}`}>
      <span className="text-caption text-slate font-medium">{label}</span>
      <span className="text-subheading font-semibold text-obsidian">{value}</span>
      {trend && (
        <span className={`text-caption ${trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
