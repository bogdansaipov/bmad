import { Link } from 'react-router-dom';
import { EmptyState as SharedEmptyState } from '../../shared/components/EmptyState';

export function EmptyState() {
  return (
    <SharedEmptyState
      icon="📋"
      title="You have no requests yet"
      action={
        <Link
          to="/requests/new"
          className="btn-primary empty-state__cta"
          style={{ minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          Create Your First Request
        </Link>
      }
    />
  );
}
