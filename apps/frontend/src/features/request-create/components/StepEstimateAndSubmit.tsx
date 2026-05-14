import { useState } from 'react';
import { submitCreateRequest } from '../api/requests.api';
import { usePricingEstimate } from '../hooks/usePricingEstimate';
import type { CreateRequestFormState } from '../types/create-request.types';

interface StepEstimateAndSubmitProps {
  formState: CreateRequestFormState;
  onBack: () => void;
  onSuccess: () => void;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function LoadingRows() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-4 rounded bg-stone-100 animate-pulse" />
      ))}
      <p className="text-sm text-stone-500">Loading estimate…</p>
    </div>
  );
}

export function StepEstimateAndSubmit({
  formState,
  onBack,
  onSuccess,
}: StepEstimateAndSubmitProps) {
  const { data, isLoading, isError } = usePricingEstimate(formState.categoryId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting || !formState.categoryId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitCreateRequest({
        categoryId: formState.categoryId,
        title: formState.title,
        description: formState.description || undefined,
        imageId: formState.imageId || undefined,
        locationLat: formState.locationLat,
        locationLng: formState.locationLng,
      });
      onSuccess();
    } catch {
      setSubmitError('Something went wrong. Your request was not submitted. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Review your request</h2>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Service estimate
        </h3>

        {isLoading && <LoadingRows />}

        {isError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            Unable to load estimate. Please go back and try again.
          </p>
        )}

        {!isLoading && !isError && data && (
          <div className="mt-4">
            <dl className="space-y-3 text-sm text-stone-600">
              <div className="flex items-center justify-between gap-4">
                <dt>Base service fee</dt>
                <dd>{formatCurrency(data.baseFee)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Category fee</dt>
                <dd>{formatCurrency(data.categoryFee)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Parts allowance</dt>
                <dd>{formatCurrency(data.partsAllowance)}</dd>
              </div>
              <hr className="border-stone-200" />
              <div className="flex items-center justify-between gap-4 font-semibold text-[#1A1A2E]">
                <dt>Estimated total</dt>
                <dd>{formatCurrency(data.estimatedTotal)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-stone-500">{data.disclaimer}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Request summary
        </h3>
        <dl className="mt-4 space-y-3 text-sm text-stone-600">
          <div className="flex items-center justify-between gap-4">
            <dt>Category</dt>
            <dd>{formState.categoryName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Title</dt>
            <dd>{formState.title}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Image</dt>
            <dd>{formState.imageId ? 'Attached' : 'None'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Location</dt>
            <dd>{formState.locationLat !== undefined ? 'Set' : 'Not set'}</dd>
          </div>
        </dl>
      </section>

      {submitError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] rounded-xl border border-stone-300 text-[#1A1A2E] font-semibold"
        >
          Back
        </button>

        {!isError && (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || isSubmitting || !data}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-700 text-white font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Submitting…' : 'Confirm & Submit Request'}
          </button>
        )}
      </div>
    </div>
  );
}
