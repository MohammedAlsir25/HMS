import { Inbox, SearchX, FileWarning, FolderOpen } from 'lucide-react';
import { Button } from './Button';

const iconMap = {
  inbox: Inbox,
  'search-x': SearchX,
  'file-warning': FileWarning,
  'folder-open': FolderOpen,
};

export default function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  const Icon = iconMap[icon] || Inbox;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-bone flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate" strokeWidth={1.5} />
      </div>
      <h3 className="text-subheading font-medium text-obsidian mb-1">{title}</h3>
      {description && (
        <p className="text-body text-slate max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
