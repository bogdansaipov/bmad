import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../customer-dashboard/api/requests.api';
import { CustomerNav } from '../../customer-dashboard/components/CustomerNav';
import { useRequestTracking } from '../hooks/useRequestTracking';
import { RequestTrackingMap } from '../components/RequestTrackingMap';
import { TrackingBottomSheet } from '../components/TrackingBottomSheet';

function isAuthError(e: unknown): e is AuthError {
  return e instanceof AuthError;
}

function isForbiddenError(e: unknown): boolean {
  return e instanceof Error && (e as Error & { status?: number }).status === 403;
}

export function RequestTrackingPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { logout } = useAuth();
  const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>('half');

  const query = useRequestTracking(requestId ?? '');
  const { isLoading, isError, error, data } = query;

  const authFailed = isError && isAuthError(error);

  useEffect(() => {
    if (authFailed) logout();
  }, [authFailed, logout]);

  if (!requestId) return <Navigate to="/dashboard" replace />;
  if (authFailed) return null;

  return (
    <div className="tracking-page">
      <CustomerNav />

      {isLoading && (
        <div className="tracking-page__map-container">
          <div className="skeleton-card" aria-busy="true" aria-live="polite" style={{ height: '100%' }} />
        </div>
      )}

      {isError && !isAuthError(error) && (
        <div role="alert" className="error-banner" style={{ margin: '1rem' }}>
          {isForbiddenError(error) ? (
            'You don\'t have access to this request.'
          ) : (
            <>
              Failed to load tracking info. Please try again.
              <button
                onClick={() => query.refetch()}
                className="btn-secondary error-banner__retry"
                style={{ minHeight: 44 }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="tracking-page__map-container">
            <RequestTrackingMap
              jobLat={data.locationLat}
              jobLng={data.locationLng}
              handymanLat={data.handymanLat}
              handymanLng={data.handymanLng}
            />
          </div>
          <TrackingBottomSheet
            tracking={data}
            sheetState={sheetState}
            onStateChange={setSheetState}
          />
        </>
      )}
    </div>
  );
}
