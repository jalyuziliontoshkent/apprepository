export type ApiErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: unknown;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const mapHttpError = (status: number, fallbackMessage: string, details?: unknown) => {
  if (status === 401) return new ApiError('Sessiya tugagan, qayta kiring', 'UNAUTHORIZED', status, details);
  if (status === 403) return new ApiError('Bu amal uchun ruxsat yo‘q', 'FORBIDDEN', status, details);
  if (status === 404) return new ApiError('Maʼlumot topilmadi', 'NOT_FOUND', status, details);
  if (status >= 500) return new ApiError('Serverda xatolik yuz berdi', 'SERVER', status, details);
  return new ApiError(fallbackMessage || 'So‘rov xatoligi', 'UNKNOWN', status, details);
};
