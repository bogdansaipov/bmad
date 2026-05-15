import { ProfileSetupBanner } from '../../handyman-dashboard/components/ProfileSetupBanner';
import { useHandymanProfile } from '../../handyman-dashboard/hooks/useHandymanProfile';
import { AvailabilityToggle } from '../components/AvailabilityToggle';
import { JobCard } from '../components/JobCard';
import { JobFeedEmptyState } from '../components/JobFeedEmptyState';
import { useHandymanJobs } from '../hooks/useHandymanJobs';

export function HandymanJobsPage() {
  const profileQuery = useHandymanProfile();
  const jobsQuery = useHandymanJobs();

  const profile = profileQuery.data;
  const jobs = jobsQuery.data ?? [];

  return (
    <div className="dashboard handyman-jobs-page">
      <div className="dashboard-header">
        <h1>Available Jobs</h1>
        {profile && (
          <AvailabilityToggle currentStatus={profile.availabilityStatus} />
        )}
      </div>

      <main className="dashboard-main">
        {!profileQuery.isLoading && profile && !profile.isProfileComplete && (
          <>
            <ProfileSetupBanner isProfileComplete={false} />
            <section
              className="locked-state"
              aria-label="Jobs unavailable until profile is complete"
            >
              <h2>Your jobs feed is locked</h2>
              <p>
                We only send work that matches your supported categories within your service
                radius. Save at least one category and a service radius to start receiving jobs.
              </p>
            </section>
          </>
        )}

        {!profileQuery.isLoading && (!profile || profile.isProfileComplete) && (
          jobsQuery.isLoading ? (
            <div className="skeleton-list" aria-busy="true" aria-live="polite">
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--meta" />
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <JobFeedEmptyState />
          ) : (
            <ul className="job-feed" aria-label="Available jobs">
              {jobs.map((job) => (
                <li key={job.offerId}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          )
        )}
      </main>
    </div>
  );
}
