import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../customer-auth/context/AuthContext';
import { AuthError } from '../../handyman-dashboard/api/handyman-profile.api';
import { HandymanNav } from '../../handyman-dashboard/components/HandymanNav';
import { ActiveJobMap } from '../components/ActiveJobMap';
import { ActiveJobBottomSheet } from '../components/ActiveJobBottomSheet';
import { useActiveJob } from '../hooks/useActiveJob';
import { usePostLocation } from '../hooks/usePostLocation';
import { useUpdateJobStatus } from '../hooks/useUpdateJobStatus';

function isAuthError(e: unknown): e is AuthError {
  return e instanceof AuthError;
}

export function ActiveJobPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>('half');

  const jobQuery = useActiveJob(requestId ?? '');
  const statusMutation = useUpdateJobStatus(requestId ?? '');
  const locationMutation = usePostLocation(requestId ?? '');

  const authFailed =
    (jobQuery.isError && isAuthError(jobQuery.error)) ||
    (statusMutation.isError && isAuthError(statusMutation.error));

  useEffect(() => {
    if (authFailed) logout();
  }, [authFailed, logout]);

  useEffect(() => {
    if (!requestId) return;
    const postCurrentLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { /* silently ignore permission/unavailable errors */ },
        { timeout: 10_000, maximumAge: 60_000 },
      );
    };
    postCurrentLocation();
    const interval = setInterval(postCurrentLocation, 30_000);
    return () => clearInterval(interval);
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!requestId) return <Navigate to="/jobs" replace />;
  if (authFailed) return null;

  const handleStatusAction = (newStatus: string) => {
    statusMutation.mutate(newStatus, {
      onSuccess: () => {
        if (newStatus === 'COMPLETE') navigate('/jobs');
      },
    });
  };

  const { isLoading, isError, error, data } = jobQuery;

  return (
    <div className="active-job-page">
      <HandymanNav />

      {isLoading && (
        <div className="skeleton-list" aria-busy="true" aria-live="polite">
          <div className="skeleton-card">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--meta" />
          </div>
        </div>
      )}

      {isError && !isAuthError(error) && (
        <div role="alert" className="error-banner">
          Failed to load active job. Please try again.
          <button
            onClick={() => jobQuery.refetch()}
            className="btn-secondary error-banner__retry"
            style={{ minHeight: 44 }}
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="active-job-page__map-container">
            <ActiveJobMap jobLat={data.locationLat} jobLng={data.locationLng} />
          </div>
          <ActiveJobBottomSheet
            job={data}
            sheetState={sheetState}
            onStateChange={setSheetState}
            onStatusAction={handleStatusAction}
            isUpdating={statusMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
