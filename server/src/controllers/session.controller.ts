import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { isAdminRole } from '../config/env';

const sessionSchema = z.object({
  label: z.string().min(1, 'Session label is required.'),
  startYear: z.number().int().min(1900).max(2200),
  endYear: z.number().int().min(1900).max(2200),
  isActive: z.boolean().optional(),
});

const sessionUpdateSchema = sessionSchema.partial();

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = isAdminRole(req.user!.role) && req.query.all === 'true';
  const sessions = await prisma.session.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { startYear: 'asc' },
    include: { _count: { select: { students: true, subjects: true } } },
  });
  res.json({ success: true, items: sessions });
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const data = sessionSchema.parse(req.body);
  const existing = await prisma.session.findUnique({ where: { label: data.label } });
  if (existing) throw errors.conflict(`Session "${data.label}" already exists.`);

  const session = await prisma.session.create({
    data: {
      label: data.label,
      startYear: data.startYear,
      endYear: data.endYear,
      isActive: data.isActive ?? true,
    },
  });
  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Session',
    entityId: session.id,
    description: `Created session "${session.label}"`,
  });
  res.status(201).json({ success: true, item: session, message: 'Session created successfully.' });
});

export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = sessionUpdateSchema.parse(req.body);
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Session not found.');

  if (data.label && data.label !== existing.label) {
    const clash = await prisma.session.findUnique({ where: { label: data.label } });
    if (clash) throw errors.conflict(`Session "${data.label}" already exists.`);
  }

  const session = await prisma.session.update({
    where: { id },
    data: { label: data.label, startYear: data.startYear, endYear: data.endYear, isActive: data.isActive },
  });
  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'Session',
    entityId: id,
    description: `Updated session "${session.label}"`,
  });
  res.json({ success: true, item: session, message: 'Session updated successfully.' });
});

export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Session not found.');

  const counts = await prisma.student.count({ where: { sessionId: id } });
  if (counts > 0) {
    throw errors.conflict('This session has students. Deactivate it instead of deleting.');
  }

  await prisma.session.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'Session',
    entityId: id,
    description: `Deleted session "${existing.label}"`,
  });
  res.json({ success: true, message: 'Session deleted successfully.' });
});
