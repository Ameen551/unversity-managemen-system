/** Wraps an async route handler so rejections reach the central error handler. */
export function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
