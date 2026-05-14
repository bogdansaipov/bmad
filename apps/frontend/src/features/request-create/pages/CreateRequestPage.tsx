import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type CreateRequestFormState,
  type CreateRequestStep,
  INITIAL_FORM_STATE,
} from '../types/create-request.types';
import { StepProgressIndicator } from '../components/StepProgressIndicator';
import { StepCategorySelect } from '../components/StepCategorySelect';
import { StepRequestDetails } from '../components/StepRequestDetails';
import { StepLocationCapture } from '../components/StepLocationCapture';
import { StepEstimateAndSubmit } from '../components/StepEstimateAndSubmit';

export function CreateRequestPage() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<CreateRequestFormState>(INITIAL_FORM_STATE);
  const [currentStep, setCurrentStep] = useState<CreateRequestStep>('category');

  useEffect(() => {
    return () => {
      if (formState.imagePreviewUrl) {
        URL.revokeObjectURL(formState.imagePreviewUrl);
      }
    };
  }, [formState.imagePreviewUrl]);

  function handleCategorySelect(id: string, name: string) {
    setFormState((s) => ({ ...s, categoryId: id, categoryName: name }));
  }

  function handleNextFromCategory() {
    setCurrentStep('details');
  }

  function handleBack() {
    setCurrentStep('category');
  }

  function handleNextFromDetails() {
    setCurrentStep('location');
  }

  function handleNextFromLocation(lat: number, lng: number) {
    setFormState((s) => ({ ...s, locationLat: lat, locationLng: lng }));
    setCurrentStep('estimate');
  }

  function handleBackFromLocation() {
    setCurrentStep('details');
  }

  function handleBackFromEstimate() {
    setCurrentStep('location');
  }

  function handleSubmitSuccess() {
    navigate('/dashboard/customer');
  }

  function handleImageUploaded(imageId: string, previewUrl: string) {
    setFormState((s) => ({ ...s, imageId, imagePreviewUrl: previewUrl }));
  }

  function handleImageRemove() {
    setFormState((s) => ({ ...s, imageId: null, imagePreviewUrl: null }));
  }

  const stepNumber: 1 | 2 | 3 | 4 =
    currentStep === 'category' ? 1 :
    currentStep === 'details' ? 2 :
    currentStep === 'location' ? 3 :
    4;

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/customer')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-stone-100"
            aria-label="Back to dashboard"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A2E]">New Request</h1>
        </div>

        <StepProgressIndicator currentStep={stepNumber} totalSteps={4} />

        {currentStep === 'category' && (
          <StepCategorySelect
            selectedCategoryId={formState.categoryId}
            onSelect={handleCategorySelect}
            onNext={handleNextFromCategory}
          />
        )}

        {currentStep === 'details' && (
          <StepRequestDetails
            title={formState.title}
            description={formState.description}
            imagePreviewUrl={formState.imagePreviewUrl}
            onTitleChange={(v) => setFormState((s) => ({ ...s, title: v }))}
            onDescriptionChange={(v) => setFormState((s) => ({ ...s, description: v }))}
            onImageUploaded={handleImageUploaded}
            onImageRemove={handleImageRemove}
            onBack={handleBack}
            onNext={handleNextFromDetails}
          />
        )}

        {currentStep === 'location' && (
          <StepLocationCapture
            locationLat={formState.locationLat}
            locationLng={formState.locationLng}
            onLocationConfirmed={handleNextFromLocation}
            onBack={handleBackFromLocation}
          />
        )}

        {currentStep === 'estimate' && (
          <StepEstimateAndSubmit
            formState={formState}
            onBack={handleBackFromEstimate}
            onSuccess={handleSubmitSuccess}
          />
        )}
      </div>
    </main>
  );
}
