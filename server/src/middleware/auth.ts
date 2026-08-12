import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isAdminRole } from '../config/env';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  fullName: string;
  departmentId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  fullName: string;
  departmentId: number | null;
  type: 'access';
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = {
    sub: String(user.id),
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    departmentId: user.departmentId,
    type: 'access',
  };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: String(userId), type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    return payload.type === 'access' ? payload : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret) as { sub: string; type: string };
    return payload.type === 'refresh' ? payload : null;
  } catch {
    return null;
  }
}

/** Requires a valid access token. Loads the freshest user record for authorization. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
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
  } catch (err) {
    next(err);
  }
}

/** Restricts a route to one or more roles. Server-side only. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
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
export function requireAdmin(): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.user || !isAdminRole(req.user.role)) {
      return next(errors.forbidden('Only Admin/HOD can perform this action.'));
    }
    next();
  };
}
