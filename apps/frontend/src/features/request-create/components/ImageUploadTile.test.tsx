import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageUploadTile } from './ImageUploadTile';

describe('ImageUploadTile', () => {
  const onImageSelected = vi.fn();
  const onImageRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone when no image is selected', () => {
    render(
      <ImageUploadTile
        imagePreviewUrl={null}
        onImageSelected={onImageSelected}
        onImageRemove={onImageRemove}
        isUploading={false}
        uploadError={null}
      />,
    );

    expect(screen.getByText('Add photo (optional)')).toBeDefined();
  });

  it('calls onImageSelected when a valid file is selected', () => {
    render(
      <ImageUploadTile
        imagePreviewUrl={null}
        onImageSelected={onImageSelected}
        onImageRemove={onImageRemove}
        isUploading={false}
        uploadError={null}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });

    fireEvent.change(input);

    expect(onImageSelected).toHaveBeenCalledWith(file);
  });

  it('shows error for invalid file type', () => {
    render(
      <ImageUploadTile
        imagePreviewUrl={null}
        onImageSelected={onImageSelected}
        onImageRemove={onImageRemove}
        isUploading={false}
        uploadError={null}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });

    fireEvent.change(input);

    expect(onImageSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/invalid file type/i)).toBeDefined();
  });

  it('shows error for oversized file (> 5MB)', () => {
    render(
      <ImageUploadTile
        imagePreviewUrl={null}
        onImageSelected={onImageSelected}
        onImageRemove={onImageRemove}
        isUploading={false}
        uploadError={null}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // 6 MB file
    const largeContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([largeContent], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });

    fireEvent.change(input);

    expect(onImageSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/too large/i)).toBeDefined();
  });
});
