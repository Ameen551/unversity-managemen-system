import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';

const configSchema = z.object({
  assessmentType: z.enum(['MID_TERM', 'FINAL_TERM']),
  label: z.string().min(1),
  defaultTotal: z.number().min(1),
  allowedTotals: z.array(z.number().min(1)).min(1),
  editable: z.boolean().optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

const configUpdateSchema = configSchema.partial();

export const listConfigs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (q.includeInactive !== 'true') where.isActive = true;
  const configs = await prisma.assessmentConfig.findMany({
    where,
    orderBy: [{ departmentId: 'asc' }, { assessmentType: 'asc' }],
    include: { department: { select: { id: true, name: true } } },
  });
  res.json({ success: true, items: configs });
});

export const createConfig = asyncHandler(async (req: Request, res: Response) => {
  const data = configSchema.parse(req.body);
  if (data.departmentId) {
    const dep = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dep) throw errors.notFound('Department not found.');
  }
  const config = await prisma.assessmentConfig.create({
    data: {
      assessmentType: data.assessmentType,
      label: data.label,
      defaultTotal: data.defaultTotal,
      allowedTotals: JSON.stringify(data.allowedTotals),
      editable: data.editable ?? true,
      departmentId: data.departmentId ?? null,
      isActive: data.isActive ?? true,
    },
  });
  await logAudit(req, {
    action: 'CREATE',
    entityType: 'AssessmentConfig',
    entityId: config.id,
    description: `Created assessment config "${config.label}"`,
  });
  res.status(201).json({ success: true, item: config, message: 'Assessment config created.' });
});

export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = configUpdateSchema.parse(req.body);
  const existing = await prisma.assessmentConfig.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Assessment config not found.');

  const config = await prisma.assessmentConfig.update({
    where: { id },
    data: {
      assessmentType: data.assessmentType,
      label: data.label,
      defaultTotal: data.defaultTotal,
      allowedTotals: data.allowedTotals ? JSON.stringify(data.allowedTotals) : undefined,
      editable: data.editable,
      departmentId: data.departmentId,
      isActive: data.isActive,
    },
  });
  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'AssessmentConfig',
    entityId: id,
    description: `Updated assessment config "${config.label}"`,
  });
  res.json({ success: true, item: config, message: 'Assessment config updated.' });
});

export const deleteConfig = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.assessmentConfig.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Assessment config not found.');

  await prisma.assessmentConfig.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'AssessmentConfig',
    entityId: id,
    description: `Deleted assessment config "${existing.label}"`,
  });
  res.json({ success: true, message: 'Assessment config deleted.' });
});
