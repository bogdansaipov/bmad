import { useEffect } from 'react';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { HandymanNav } from '../../handyman-dashboard/components/HandymanNav';
import { useHandymanHistory } from '../hooks/useHandymanHistory';
import { JobHistoryRow } from '../components/JobHistoryRow';

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function HandymanHistoryPage() {
  const { logout } = useAuth();
  const historyQuery = useHandymanHistory();

  const { isLoading, isError, error, data } = historyQuery;

  const authFailed = isError && isAuthError(error);

  useEffect(() => {
    if (authFailed) logout();
  }, [authFailed, logout]);

  if (authFailed) return null;

  return (
    <div className="dashboard handyman-dashboard">
      <HandymanNav />
      <div className="dashboard-header">
        <h1>Job History</h1>
      </div>

      <main className="dashboard-main">
        {isLoading && (
          <div className="skeleton-list" aria-busy="true" aria-live="polite">
            <div className="skeleton-card">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--meta" />
            </div>
            <div className="skeleton-card">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--meta" />
            </div>
          </div>
        )}

        {isError && !isAuthError(error) && (
          <div role="alert" className="error-banner">
            Failed to load job history. Please try again.
            <button
              onClick={() => historyQuery.refetch()}
              className="btn-secondary error-banner__retry"
              style={{ minHeight: 44 }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <div className="empty-state">
            <h2>No job history yet</h2>
            <p>Jobs you accept or decline will appear here.</p>
          </div>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.map((item) => (
              <li key={item.offerId}>
                <JobHistoryRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
