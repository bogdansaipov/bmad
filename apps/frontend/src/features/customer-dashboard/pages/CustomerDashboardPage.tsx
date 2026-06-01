import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerRequests } from '../hooks/useCustomerRequests';
import { AuthError } from '../api/requests.api';
import { RequestCard } from '../components/RequestCard';
import { EmptyState } from '../components/EmptyState';
import { RequestListSkeleton } from '../components/RequestListSkeleton';
import { CustomerNav } from '../components/CustomerNav';

export function CustomerDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useCustomerRequests();
  const isAuthError = error instanceof AuthError;
  const showErrorBanner = isError && !isLoading && !isAuthError;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My Requests</h1>
        <Link
          to="/requests/new"
          className="btn-primary"
          style={{ minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center', width: 'auto', whiteSpace: 'nowrap' }}
        >
          New Request
        </Link>
      </div>

      <main className="dashboard-main">
        {isLoading && <RequestListSkeleton />}

        {showErrorBanner && (
          <div role="alert" className="error-banner">
            Failed to load requests. Please try again.
            <button
              onClick={() => refetch()}
              className="btn-secondary error-banner__retry"
              style={{ minHeight: 44 }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.items.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="request-list">
                {data.items.map((item, index) => (
                  <li key={item.id} style={{ ['--card-index' as string]: index } as CSSProperties}>
                    <RequestCard item={item} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <CustomerNav />
    </div>
  );
}
