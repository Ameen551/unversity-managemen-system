import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { isAdminRole } from '../config/env';

const semesterSchema = z.object({
  name: z.string().min(1, 'Semester name is required.'),
  number: z.number().int().min(1, 'Semester number must be at least 1.'),
  departmentId: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const semesterUpdateSchema = semesterSchema.partial();

export const listSemesters = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = Number(req.query.departmentId);
  if (!departmentId) throw errors.badRequest('departmentId query parameter is required.');
  const includeInactive = isAdminRole(req.user!.role) && req.query.all === 'true';
  const semesters = await prisma.semester.findMany({
    where: { departmentId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { number: 'asc' },
    include: { _count: { select: { students: true, subjects: true } } },
  });
  res.json({ success: true, items: semesters });
});

export const getSemester = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const semester = await prisma.semester.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!semester) throw errors.notFound('Semester not found.');
  res.json({ success: true, item: semester });
});

export const createSemester = asyncHandler(async (req: Request, res: Response) => {
  const data = semesterSchema.parse(req.body);
  const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!department) throw errors.notFound('Department not found.');

  const existing = await prisma.semester.findFirst({
    where: { departmentId: data.departmentId, number: data.number },
  });
  if (existing) {
    throw errors.conflict(
      `Semester ${data.number} already exists for ${department.name}.`
    );
  }

  const semester = await prisma.semester.create({
    data: {
      name: data.name,
      number: data.number,
      departmentId: data.departmentId,
      isActive: data.isActive ?? true,
    },
  });
  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Semester',
    entityId: semester.id,
    description: `Created ${semester.name} for ${department.name}`,
  });
  res.status(201).json({ success: true, item: semester, message: 'Semester created successfully.' });
});

export const updateSemester = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = semesterUpdateSchema.parse(req.body);
  const existing = await prisma.semester.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Semester not found.');

  if (data.departmentId && data.number) {
    const clash = await prisma.semester.findFirst({
      where: { departmentId: data.departmentId, number: data.number, id: { not: id } },
    });
    if (clash) throw errors.conflict('That semester number already exists for the department.');
  }

  const semester = await prisma.semester.update({
    where: { id },
    data: {
      name: data.name,
      number: data.number,
      departmentId: data.departmentId,
      isActive: data.isActive,
    },
  });
  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'Semester',
    entityId: id,
    description: `Updated ${semester.name}`,
  });
  res.json({ success: true, item: semester, message: 'Semester updated successfully.' });
});

export const deleteSemester = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.semester.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Semester not found.');

  const counts = await prisma.student.count({ where: { semesterId: id } });
  if (counts > 0) {
    throw errors.conflict('This semester has students. Deactivate it instead of deleting.');
  }

  await prisma.semester.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'Semester',
    entityId: id,
    description: `Deleted ${existing.name}`,
  });
  res.json({ success: true, message: 'Semester deleted successfully.' });
});

/** Convenience: create semesters 1..N for a department in one call (admin). */
export const bulkCreateSemesters = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    departmentId: z.number().int().positive(),
    count: z.number().int().min(1).max(12),
  });
  const body = schema.parse(req.body);

  const department = await prisma.department.findUnique({ where: { id: body.departmentId } });
  if (!department) throw errors.notFound('Department not found.');

  const existing = await prisma.semester.findMany({
    where: { departmentId: body.departmentId },
    select: { number: true },
  });
  const existingNumbers = new Set(existing.map((s) => s.number));

  let created = 0;
  for (let n = 1; n <= body.count; n++) {
    if (existingNumbers.has(n)) continue;
    await prisma.semester.create({
      data: { name: `Semester ${n}`, number: n, departmentId: body.departmentId },
    });
    created++;
  }

  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Semester',
    entityId: body.departmentId,
    description: `Created ${created} semester(s) for ${department.name}`,
  });
  res.status(201).json({
    success: true,
    message: `${created} semester(s) created for ${department.name}.`,
    created,
  });
});
