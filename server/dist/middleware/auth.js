import jwt from 'jsonwebtoken';
import { env, isAdminRole } from '../config/env';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
export function signAccessToken(user) {
    const payload = {
        sub: String(user.id),
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        departmentId: user.departmentId,
        type: 'access',
    };
    return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires });
}
export function signRefreshToken(userId) {
    return jwt.sign({ sub: String(userId), type: 'refresh' }, env.jwtRefreshSecret, {
        expiresIn: env.jwtRefreshExpires,
    });
}
export function verifyAccessToken(token) {
    try {
        const payload = jwt.verify(token, env.jwtAccessSecret);
        return payload.type === 'access' ? payload : null;
    }
    catch {
        return null;
    }
}
export function verifyRefreshToken(token) {
    try {
        const payload = jwt.verify(token, env.jwtRefreshSecret);
        return payload.type === 'refresh' ? payload : null;
    }
    catch {
        return null;
    }
}
/** Requires a valid access token. Loads the freshest user record for authorization. */
export async function requireAuth(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw errors.unauthorized();
        }
        const token = header.slice('Bearer '.length);
        const payload = verifyAccessToken(token);
        if (!payload) {
            throw errors.unauthorized('Session expired. Please log in again.');
        }
        const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
        if (!user || !user.isActive) {
            throw errors.unauthorized('Account is inactive or no longer exists.');
        }
        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName,
            departmentId: user.departmentId,
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
/** Restricts a route to one or more roles. Server-side only. */
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(errors.unauthorized());
        }
        if (!roles.includes(req.user.role)) {
            return next(errors.forbidden('You do not have permission to perform this action.'));
        }
        next();
    };
}
/** Restricts to admin-level roles (ADMIN or HOD). */
export function requireAdmin() {
    return (req, res, next) => {
        if (!req.user || !isAdminRole(req.user.role)) {
            return next(errors.forbidden('Only Admin/HOD can perform this action.'));
        }
        next();
    };
}
