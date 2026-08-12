import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';

const createSchema = z.object({
  studentId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
});

export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (q.studentId) where.studentId = Number(q.studentId);
  if (q.subjectId) where.subjectId = Number(q.subjectId);

  const enrollments = await prisma.enrollment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, name: true, studentId: true, section: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
  });
  res.json({ success: true, items: enrollments });
});

export const createEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const [student, subject] = await Promise.all([
    prisma.student.findUnique({ where: { id: data.studentId } }),
    prisma.subject.findUnique({ where: { id: data.subjectId } }),
  ]);
  if (!student || student.isDeleted) throw errors.notFound('Student not found.');
  if (!subject) throw errors.notFound('Subject not found.');

  const enrollment = await prisma.enrollment.create({
    data: { studentId: data.studentId, subjectId: data.subjectId },
  });
  await logAudit(req, {
    action: 'CREATE',
    entityType: 'Enrollment',
    entityId: enrollment.id,
    description: `Enrolled student "${student.name}" in "${subject.name}"`,
  });
  res.status(201).json({ success: true, item: enrollment, message: 'Student enrolled successfully.' });
});

export const deleteEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.enrollment.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Enrollment not found.');

  await prisma.enrollment.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'Enrollment',
    entityId: id,
    description: 'Removed a student enrollment',
  });
  res.json({ success: true, message: 'Enrollment removed.' });
});
