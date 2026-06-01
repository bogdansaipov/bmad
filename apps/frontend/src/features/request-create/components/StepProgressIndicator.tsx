interface StepProgressIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  totalSteps: 4;
}

export function StepProgressIndicator({ currentStep, totalSteps }: StepProgressIndicatorProps) {
  return (
    <div className="step-progress" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <p className="step-progress__label">Step {currentStep} of {totalSteps}</p>
      <div className="step-progress__bars">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`step-progress__bar${i < currentStep ? ' step-progress__bar--done' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
