export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetails;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
