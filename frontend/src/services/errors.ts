export type ApiErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code:     ApiErrorCode;
  readonly status?:  number;
  readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: unknown) {
    super(message);
    this.name    = 'ApiError';
    this.code    = code;
    this.status  = status;
    this.details = details;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const mapHttpError = (status: number, message: string, details?: unknown): ApiError => {
  if (status === 401) return new ApiError('Sessiya tugagan, qayta kiring', 'UNAUTHORIZED', status, details);
  if (status === 403) return new ApiError('Bu amal uchun ruxsat yo\'q', 'FORBIDDEN', status, details);
  if (status === 404) return new ApiError('Ma\'lumot topilmadi', 'NOT_FOUND', status, details);
  if (status === 422) return new ApiError(message || 'Noto\'g\'ri ma\'lumot', 'VALIDATION', status, details);
  if (status >= 500)  return new ApiError('Serverda xatolik yuz berdi', 'SERVER', status, details);
  return new ApiError(message || 'So\'rov xatoligi', 'UNKNOWN', status, details);
};

/** Type-safe check for API errors */
export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
