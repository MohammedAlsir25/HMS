import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

import { useState } from 'react';

export default function ClinicDashboardShell({
  title,
  subtitle,
  children,
  historyPanel,
}) {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">{title}</h1>
        {subtitle && <p className="text-body text-slate mt-1">{subtitle}</p>}
      </div>

      {historyPanel && (
        <div className="flex gap-1 border-b border-silver">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors touch-target ${
              activeTab === 'queue'
                ? 'border-lilac-bloom text-lilac-bloom'
                : 'border-transparent text-slate hover:text-obsidian'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors touch-target ${
              activeTab === 'history'
                ? 'border-lilac-bloom text-lilac-bloom'
                : 'border-transparent text-slate hover:text-obsidian'
            }`}
          >
            History
          </button>
        </div>
      )}

      {activeTab === 'history' && historyPanel ? historyPanel : children}
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
        <span className={`text-caption ${trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
