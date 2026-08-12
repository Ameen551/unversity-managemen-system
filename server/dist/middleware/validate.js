import { errors } from '../utils/AppError';
/** Validates a request part against a zod schema and mutates it to the parsed value. */
export function validate(schema, source = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return next(result.error);
        }
        req[source] = result.data;
        next();
    };
}
export function parsePositiveInt(value, fieldName) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        throw errors.badRequest(`${fieldName} must be a positive integer.`);
    }
    return num;
}
export function parseOptionalInt(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    return Number(value);
}
