import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { logAudit } from './audit.service';
const COOKIE_NAME = 'refreshToken';
export function setRefreshCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
}
export function clearRefreshCookie(res) {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth' });
}
function toAuthUser(user) {
    return { id: user.id, username: user.username, role: user.role, fullName: user.fullName, departmentId: user.departmentId };
}
export async function login(req, username, password) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
        throw errors.unauthorized('Invalid username or password.');
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
        throw errors.unauthorized('Invalid username or password.');
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const authUser = toAuthUser(user);
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(user.id);
    await logAudit(req, {
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        description: `${authUser.role} logged in`,
    });
    return { authUser, accessToken, refreshToken };
}
export async function refreshSession(req) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        throw errors.unauthorized('No active session. Please log in.');
    }
    const payload = verifyRefreshToken(token);
    if (!payload) {
        throw errors.unauthorized('Session expired. Please log in again.');
    }
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.isActive) {
        throw errors.unauthorized('Account is inactive or no longer exists.');
    }
    const authUser = toAuthUser(user);
    return { authUser, accessToken: signAccessToken(authUser) };
}
export async function changePassword(req, userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw errors.notFound('User not found.');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
        throw errors.badRequest('Current password is incorrect.');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await logAudit(req, {
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        description: 'Changed own password',
    });
}
