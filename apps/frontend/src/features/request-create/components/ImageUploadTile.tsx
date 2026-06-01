import { useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface ImageUploadTileProps {
  imagePreviewUrl: string | null;
  onImageSelected: (file: File) => void;
  onImageRemove: () => void;
  isUploading: boolean;
  uploadError: string | null;
}

export function ImageUploadTile({
  imagePreviewUrl,
  onImageSelected,
  onImageRemove,
  isUploading,
  uploadError,
}: ImageUploadTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('Invalid file type. Allowed: JPEG, PNG, WebP.');
      e.target.value = '';
      return;
    }

    if (file.size === 0) {
      setValidationError('File is empty.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setValidationError('File is too large. Maximum size is 5 MB.');
      e.target.value = '';
      return;
    }

    onImageSelected(file);
    e.target.value = '';
  }

  const displayError = validationError ?? uploadError;

  return (
    <div className="image-upload-wrap">
      {!imagePreviewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="image-upload-btn"
        >
          Add photo (optional)
        </button>
      ) : (
        <div className="image-upload-preview">
          <img
            src={imagePreviewUrl}
            alt="Selected preview"
            className="image-upload-preview__img"
          />
          {isUploading && (
            <div className="image-upload-preview__overlay">
              <span className="image-upload-preview__overlay-text">Uploading…</span>
            </div>
          )}
          {!isUploading && (
            <button
              type="button"
              onClick={onImageRemove}
              className="image-upload-preview__remove"
              aria-label="Remove image"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {displayError && (
        <p className="image-upload-error" role="alert">
          {displayError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload a photo of the issue"
        onChange={handleFileChange}
      />
    </div>
  );
}
