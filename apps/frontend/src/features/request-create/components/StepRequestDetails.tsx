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
    <div className="create-step">
      <h2>Describe your request</h2>

      <div className="create-step__field">
        <label htmlFor="request-title">
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
          placeholder="e.g. Leaking kitchen faucet"
          aria-required="true"
          aria-describedby={titleError ? 'title-error' : undefined}
        />
        {titleError && (
          <span id="title-error" className="field-error" role="alert">
            {titleError}
          </span>
        )}
      </div>

      <div className="create-step__field">
        <label htmlFor="request-description">Description (optional)</label>
        <textarea
          id="request-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Describe the problem in more detail"
        />
      </div>

      <div className="create-step__field">
        <label>Photo</label>
        <ImageUploadTile
          imagePreviewUrl={imagePreviewUrl}
          onImageSelected={(file) => void handleImageSelected(file)}
          onImageRemove={onImageRemove}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </div>

      <div className="create-step__actions">
        <button type="button" onClick={onBack} className="btn-outline">
          Back
        </button>
        <button type="button" onClick={handleNext} disabled={isUploading} className="btn-primary">
          Next
        </button>
      </div>
    </div>
  );
}
