const sizeMap = {
  text: { sm: 'h-3', md: 'h-4', lg: 'h-5' },
  heading: { sm: 'h-5', md: 'h-7', lg: 'h-9' },
  circular: { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' },
  rectangular: { sm: 'h-20', md: 'h-32', lg: 'h-48' },
  card: { sm: 'h-24', md: 'h-40', lg: 'h-56' },
};

const widthMap = {
  full: 'w-full',
  '3/4': 'w-3/4',
  '1/2': 'w-1/2',
  '1/3': 'w-1/3',
  '1/4': 'w-1/4',
};

export function Skeleton({
  variant = 'text',
  size = 'md',
  width = 'full',
  className = '',
  count = 1,
  style,
}) {
  const base = 'bg-silver/30 dark:bg-silver/10 rounded animate-pulse';

  if (count > 1) {
    return (
      <div className={`space-y-2 ${className}`} style={style}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`${base} ${sizeMap[variant]?.[size] || sizeMap.text.md} ${widthMap[width] || widthMap.full}`} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${base} ${sizeMap[variant]?.[size] || sizeMap.text.md} ${widthMap[width] || widthMap.full} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard({ className = '', lines = 3 }) {
  return (
    <div className={`card-surface p-6 space-y-3 ${className}`}>
      <Skeleton variant="heading" size="sm" width="1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" size="md" width={i === lines - 1 ? '2/3' : 'full'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`card-surface overflow-hidden ${className}`}>
      <div className="flex gap-4 p-4 border-b border-silver">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} variant="text" size="sm" width="full" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 p-4 border-b border-silver/50">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} variant="text" size="md" width={c === 0 ? '1/4' : 'full'} />
          ))}
        </div>
      ))}
    </div>
  );
}
