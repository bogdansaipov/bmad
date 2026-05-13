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
    <div className="flex flex-col gap-2">
      {!imagePreviewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[80px] border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center text-stone-500 text-sm hover:border-blue-400 transition-colors"
        >
          Add photo (optional)
        </button>
      ) : (
        <div className="relative w-full rounded-xl overflow-hidden border border-stone-200">
          <img
            src={imagePreviewUrl}
            alt="Selected preview"
            className="w-full object-cover max-h-48"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="text-blue-700 font-medium text-sm">Uploading…</span>
            </div>
          )}
          {!isUploading && (
            <button
              type="button"
              onClick={onImageRemove}
              className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-[#1A1A2E] text-xs font-bold"
              aria-label="Remove image"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {displayError && (
        <p className="text-red-600 text-sm" role="alert">
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
