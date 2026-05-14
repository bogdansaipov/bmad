interface ProfileSetupBannerProps {
  isProfileComplete: boolean;
}

export function ProfileSetupBanner({ isProfileComplete }: ProfileSetupBannerProps) {
  if (isProfileComplete) {
    return (
      <div className="profile-banner profile-banner--ready" role="status">
        <strong>You're set up to receive jobs.</strong>
        <span>Update your categories or radius below at any time.</span>
      </div>
    );
  }

  return (
    <div className="profile-banner profile-banner--blocked" role="status">
      <strong>Finish your profile to start receiving jobs.</strong>
      <span>Pick at least one category and set your service radius before jobs are sent your way.</span>
    </div>
  );
}
