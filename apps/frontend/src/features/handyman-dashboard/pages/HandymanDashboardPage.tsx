import { useAuth } from '../../customer-auth/context/AuthContext';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { AuthError } from '../api/handyman-profile.api';
import { HandymanNav } from '../components/HandymanNav';
import { HandymanProfileForm } from '../components/HandymanProfileForm';
import { ProfileSetupBanner } from '../components/ProfileSetupBanner';
import {
  useHandymanCategoriesQuery,
  useHandymanProfile,
  useUpdateHandymanProfile,
} from '../hooks/useHandymanProfile';

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function HandymanDashboardPage() {
  const { user, logout } = useAuth();
  const profileQuery = useHandymanProfile();
  const categoriesQuery = useHandymanCategoriesQuery();
  const updateMutation = useUpdateHandymanProfile();

  const isLoading = profileQuery.isLoading || categoriesQuery.isLoading;
  const error = profileQuery.error ?? categoriesQuery.error;
  const showError = !isLoading && !!error && !isAuthError(error);

  const submitError = updateMutation.error
    ? updateMutation.error instanceof Error
      ? updateMutation.error.message
      : 'Failed to save profile. Please try again.'
    : null;

  return (
    <div className="dashboard handyman-dashboard">
      <HandymanNav />
      <div className="dashboard-header">
        <div>
          <h1>Handyman Dashboard</h1>
          <p style={{ marginTop: 4 }}>Welcome back, {user?.email}</p>
        </div>
        <button className="btn-secondary" onClick={logout} style={{ minHeight: 44 }}>
          Log out
        </button>
      </div>

      <main className="dashboard-main">
        <div className="handyman-dashboard__layout">
          <div className="handyman-dashboard__main">
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

            {showError && (
              <div role="alert" className="error-banner">
                Failed to load your profile. Please try again.
                <button
                  onClick={() => {
                    profileQuery.refetch();
                    categoriesQuery.refetch();
                  }}
                  className="btn-secondary error-banner__retry"
                  style={{ minHeight: 44 }}
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !showError && profileQuery.data && categoriesQuery.data && (
              <>
                {!profileQuery.data.isProfileComplete && (
                  <section
                    className="locked-state"
                    aria-label="Jobs unavailable until profile is complete"
                  >
                    <SectionHeader>Your jobs feed is locked</SectionHeader>
                    <p>
                      We only send work that matches your supported categories within your service
                      radius. Save at least one category and a service radius below to start
                      receiving jobs.
                    </p>
                  </section>
                )}

                <section aria-label="Profile settings" className="profile-settings">
                  <SectionHeader>Profile settings</SectionHeader>
                  <HandymanProfileForm
                    profile={profileQuery.data}
                    categories={categoriesQuery.data.items}
                    isSubmitting={updateMutation.isPending}
                    submitError={submitError}
                    onSubmit={(payload) => updateMutation.mutate(payload)}
                  />
                </section>
              </>
            )}
          </div>

          <aside className="handyman-dashboard__sidebar" aria-label="Profile status">
            {!isLoading && !showError && profileQuery.data && categoriesQuery.data && (
              <ProfileSetupBanner isProfileComplete={profileQuery.data.isProfileComplete} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
