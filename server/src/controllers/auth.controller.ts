import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import {
  changePassword,
  clearRefreshCookie,
  login,
  refreshSession,
  setRefreshCookie,
} from '../services/auth.service';
import { logAudit } from '../services/audit.service';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const { authUser, accessToken, refreshToken } = await login(req, body.username, body.password);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, user: authUser, accessToken });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const { authUser, accessToken } = await refreshSession(req);
  res.json({ success: true, user: authUser, accessToken });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  await logAudit(req, { action: 'LOGOUT', entityType: 'User', entityId: req.user?.id, description: 'Logged out' });
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = changePasswordSchema.parse(req.body);
  await changePassword(req, req.user!.id, body.currentPassword, body.newPassword);
  res.json({ success: true, message: 'Password changed successfully.' });
});
