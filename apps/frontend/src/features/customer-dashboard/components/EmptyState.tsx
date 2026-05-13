import { Link } from 'react-router-dom';

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">📋</div>
      <p className="empty-state__message">You have no requests yet</p>
      <Link
        to="/requests/new"
        className="btn-primary empty-state__cta"
        style={{ minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}
      >
        Create Your First Request
      </Link>
    </div>
  );
}
