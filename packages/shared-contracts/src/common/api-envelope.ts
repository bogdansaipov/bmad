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
