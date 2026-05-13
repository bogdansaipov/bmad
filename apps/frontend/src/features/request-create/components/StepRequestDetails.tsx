import { useEffect, useRef, useState } from 'react';
import { uploadRequestImage } from '../api/uploads.api';
import { ImageUploadTile } from './ImageUploadTile';

interface StepRequestDetailsProps {
  title: string;
  description: string;
  imagePreviewUrl: string | null;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onImageUploaded: (imageId: string, previewUrl: string) => void;
  onImageRemove: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepRequestDetails({
  title,
  description,
  imagePreviewUrl,
  onTitleChange,
  onDescriptionChange,
  onImageUploaded,
  onImageRemove,
  onBack,
  onNext,
}: StepRequestDetailsProps) {
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleImageSelected(file: File) {
    if (isUploading) return;
    setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    setIsUploading(true);
    try {
      const { imageId } = await uploadRequestImage(file);
      if (!isMountedRef.current) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      onImageUploaded(imageId, previewUrl);
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(message);
    } finally {
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  }

  function handleNext() {
    if (!title.trim()) {
      setTitleError('Title is required.');
      return;
    }
    setTitleError(null);
    onNext();
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-[#1A1A2E]">Describe your request</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="request-title" className="text-sm font-medium text-[#1A1A2E]">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="request-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitleError(null);
            onTitleChange(e.target.value);
          }}
          maxLength={100}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
          placeholder="e.g. Leaking kitchen faucet"
          aria-required="true"
          aria-describedby={titleError ? 'title-error' : undefined}
        />
        {titleError && (
          <p id="title-error" className="text-red-600 text-sm" role="alert">
            {titleError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="request-description" className="text-sm font-medium text-[#1A1A2E]">
          Description (optional)
        </label>
        <textarea
          id="request-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-700 resize-none"
          placeholder="Describe the problem in more detail"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[#1A1A2E]">Photo</span>
        <ImageUploadTile
          imagePreviewUrl={imagePreviewUrl}
          onImageSelected={(file) => void handleImageSelected(file)}
          onImageRemove={onImageRemove}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </div>

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[44px] border border-stone-300 text-[#1A1A2E] font-semibold rounded-xl py-3"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isUploading}
          className="flex-1 min-h-[44px] bg-blue-700 text-white font-semibold rounded-xl py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
