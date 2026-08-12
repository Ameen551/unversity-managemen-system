export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  badRequest: (message: string, details?: unknown) => new AppError(400, message, 'BAD_REQUEST', details),
  unauthorized: (message = 'Authentication required') => new AppError(401, message, 'UNAUTHORIZED'),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError(403, message, 'FORBIDDEN'),
  notFound: (message = 'Resource not found') => new AppError(404, message, 'NOT_FOUND'),
  conflict: (message: string) => new AppError(409, message, 'CONFLICT'),
  unprocessable: (message: string, details?: unknown) => new AppError(422, message, 'UNPROCESSABLE_ENTITY', details),
  internal: (message = 'Something went wrong on the server') => new AppError(500, message, 'INTERNAL_ERROR'),
};
