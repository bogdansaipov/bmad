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
    <div aria-busy="true" style={{ marginTop: '1rem' }}>
      <div className="skeleton-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-line" style={{ height: '1rem' }} />
        ))}
      </div>
      <p className="create-step__hint" style={{ marginTop: '0.5rem' }}>Loading estimate…</p>
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
    <div className="create-step">
      <h2>Review your request</h2>

      <section className="estimate-section">
        <h3>Service estimate</h3>

        {isLoading && <LoadingRows />}

        {isError && (
          <p className="field-error" role="alert" style={{ marginTop: '0.75rem' }}>
            Unable to load estimate. Please go back and try again.
          </p>
        )}

        {!isLoading && !isError && data && (
          <div>
            <dl className="estimate-list">
              <div className="estimate-row">
                <dt>Base service fee</dt>
                <dd>{formatCurrency(data.baseFee)}</dd>
              </div>
              <div className="estimate-row">
                <dt>Category fee</dt>
                <dd>{formatCurrency(data.categoryFee)}</dd>
              </div>
              <div className="estimate-row">
                <dt>Parts allowance</dt>
                <dd>{formatCurrency(data.partsAllowance)}</dd>
              </div>
              <hr className="estimate-divider" />
              <div className="estimate-row estimate-row--total">
                <dt>Estimated total</dt>
                <dd>{formatCurrency(data.estimatedTotal)}</dd>
              </div>
            </dl>
            <p className="estimate-disclaimer">{data.disclaimer}</p>
          </div>
        )}
      </section>

      <section className="estimate-section">
        <h3>Request summary</h3>
        <dl className="estimate-list">
          <div className="estimate-row">
            <dt>Category</dt>
            <dd>{formState.categoryName}</dd>
          </div>
          <div className="estimate-row">
            <dt>Title</dt>
            <dd>{formState.title}</dd>
          </div>
          <div className="estimate-row">
            <dt>Image</dt>
            <dd>{formState.imageId ? 'Attached' : 'None'}</dd>
          </div>
          <div className="estimate-row">
            <dt>Location</dt>
            <dd>{formState.locationLat !== undefined ? 'Set' : 'Not set'}</dd>
          </div>
        </dl>
      </section>

      {submitError && (
        <div className="server-error" role="alert">
          {submitError}
        </div>
      )}

      <div className="create-step__actions">
        <button type="button" onClick={onBack} disabled={isSubmitting} className="btn-outline">
          Back
        </button>
        {!isError && (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || isSubmitting || !data}
            className="btn-primary"
          >
            {isSubmitting ? 'Submitting…' : 'Confirm & Submit Request'}
          </button>
        )}
      </div>
    </div>
  );
}
