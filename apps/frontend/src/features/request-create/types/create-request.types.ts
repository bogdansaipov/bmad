export type CreateRequestStep = 'category' | 'details' | 'location' | 'estimate';

export interface CreateRequestFormState {
  // Step 1
  categoryId: string | null;
  categoryName: string | null; // for display only
  // Step 2
  title: string;
  description: string;
  imageId: string | null; // returned from upload endpoint — sent in 2.4
  imagePreviewUrl: string | null; // blob URL for local preview only
  // Step 3 (Story 2.3)
  locationLat?: number;
  locationLng?: number;
  // Step 4 reads existing state only
}

export const INITIAL_FORM_STATE: CreateRequestFormState = {
  categoryId: null,
  categoryName: null,
  title: '',
  description: '',
  imageId: null,
  imagePreviewUrl: null,
};
