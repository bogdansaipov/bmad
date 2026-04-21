import { z } from 'zod';

export type ApiError = {
  code: string;
  message: string;
  recoveryHint?: string;
};

export type ApiSuccessResponse<TData, TMeta = Record<string, unknown> | undefined> = {
  data: TData;
  meta?: TMeta;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  recoveryHint: z.string().min(1).optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorSchema,
});

export function createSuccessResponse<TData, TMeta = Record<string, unknown> | undefined>(
  data: TData,
  meta?: TMeta,
): ApiSuccessResponse<TData, TMeta> {
  if (meta === undefined) {
    return { data };
  }

  return { data, meta };
}

export function createErrorResponse(error: ApiError): ApiErrorResponse {
  return { error };
}
