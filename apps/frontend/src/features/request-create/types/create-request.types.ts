export type CreateRequestStep = 'category' | 'details' | 'location'; // Story 2.3 adds 'location'
// 'estimate' added by Story 2.4

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
  // Step 4 (Story 2.4 will extend)
}

export const INITIAL_FORM_STATE: CreateRequestFormState = {
  categoryId: null,
  categoryName: null,
  title: '',
  description: '',
  imageId: null,
  imagePreviewUrl: null,
};
