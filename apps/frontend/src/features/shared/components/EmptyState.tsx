import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <p role="heading" aria-level={2} className="empty-state__title">{title}</p>
      {description && <p className="empty-state__message">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
