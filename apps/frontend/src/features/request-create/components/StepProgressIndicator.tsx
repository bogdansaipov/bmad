interface StepProgressIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  totalSteps: 4;
}

export function StepProgressIndicator({ currentStep, totalSteps }: StepProgressIndicatorProps) {
  return (
    <div
      className="flex flex-col gap-2"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      <p className="text-xs text-stone-500">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-1 flex-1 rounded-full',
              i < currentStep ? 'bg-blue-700' : 'bg-stone-200',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
