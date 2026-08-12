export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code = 'ERROR', details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export const errors = {
    badRequest: (message, details) => new AppError(400, message, 'BAD_REQUEST', details),
    unauthorized: (message = 'Authentication required') => new AppError(401, message, 'UNAUTHORIZED'),
    forbidden: (message = 'You do not have permission to perform this action') => new AppError(403, message, 'FORBIDDEN'),
    notFound: (message = 'Resource not found') => new AppError(404, message, 'NOT_FOUND'),
    conflict: (message) => new AppError(409, message, 'CONFLICT'),
    unprocessable: (message, details) => new AppError(422, message, 'UNPROCESSABLE_ENTITY', details),
    internal: (message = 'Something went wrong on the server') => new AppError(500, message, 'INTERNAL_ERROR'),
};
