// API response wrappers

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth
export interface AuthVerifyInput {
  password: string;
}

export interface AuthStatus {
  authenticated: boolean;
}

// Upload
export interface UploadResponse {
  files: Array<{
    id: string;
    filePath: string;
    originalName: string;
  }>;
}

// LLM Parse
export interface ParseRecipeInput {
  url?: string;
  images?: string[];  // Base64 encoded images
}
