import type { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';

const teacherSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.').transform((v) => v.trim()),
  fullName: z.string().min(2, 'Full name is required.'),
  email: z.string().email('Invalid email.').optional().nullable(),
  departmentId: z.number().int().positive().optional().nullable(),
  role: z.enum(['TEACHER']).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
});

const teacherUpdateSchema = teacherSchema.omit({ role: true }).partial();

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters.').optional(),
});

export const listTeachers = asyncHandler(async (req: Request, res: Response) => {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      employeeId: true,
      phone: true,
      designation: true,
      qualification: true,
      photo: true,
      _count: { select: { createdStudents: true } },
    },
  });
  res.json({ success: true, items: teachers });
});

export const createTeacher = asyncHandler(async (req: Request, res: Response) => {
  const data = teacherSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw errors.conflict(`Username "${data.username}" is already taken.`);

  // Auto-generate employee ID: TCH-YYYY-NNN
  const year = new Date().getFullYear();
  const count = await prisma.user.count({ where: { role: 'TEACHER' } });
  const employeeId = `TCH-${year}-${String(count + 1).padStart(3, '0')}`;

  // Secure generated temporary password (not stored anywhere).
  const password = crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);

  const teacher = await prisma.user.create({
    data: {
      username: data.username,
      fullName: data.fullName,
      email: data.email ?? null,
      departmentId: data.departmentId ?? null,
      role: 'TEACHER',
      isActive: data.isActive ?? true,
      passwordHash,
      employeeId,
      phone: data.phone ?? null,
      designation: data.designation ?? null,
      qualification: data.qualification ?? null,
      photo: data.photo ?? null,
    },
  });

  await logAudit(req, {
    action: 'CREATE',
    entityType: 'User',
    entityId: teacher.id,
    description: `Created teacher account "${teacher.fullName}" (${teacher.username}) [${employeeId}]`,
  });

  res.status(201).json({
    success: true,
    item: {
      id: teacher.id,
      username: teacher.username,
      fullName: teacher.fullName,
      email: teacher.email,
      departmentId: teacher.departmentId,
      isActive: teacher.isActive,
      employeeId: teacher.employeeId,
      phone: teacher.phone,
      designation: teacher.designation,
      qualification: teacher.qualification,
      photo: teacher.photo,
    },
    message: `Teacher account created. Employee ID: ${employeeId}. Temporary password (shown once): ${password}`,
    temporaryPassword: password,
  });
});

export const updateTeacher = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = teacherUpdateSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Teacher not found.');

  if (data.username && data.username !== existing.username) {
    const clash = await prisma.user.findUnique({ where: { username: data.username } });
    if (clash) throw errors.conflict(`Username "${data.username}" is already taken.`);
  }

  const teacher = await prisma.user.update({
    where: { id },
    data: {
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      departmentId: data.departmentId,
      isActive: data.isActive,
      phone: data.phone,
      designation: data.designation,
      qualification: data.qualification,
      photo: data.photo,
    },
  });

  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    description: `Updated teacher "${teacher.fullName}"`,
  });
  res.json({
    success: true,
    item: {
      id: teacher.id,
      username: teacher.username,
      fullName: teacher.fullName,
      email: teacher.email,
      departmentId: teacher.departmentId,
      isActive: teacher.isActive,
      employeeId: teacher.employeeId,
      phone: teacher.phone,
      designation: teacher.designation,
      qualification: teacher.qualification,
      photo: teacher.photo,
    },
    message: 'Teacher updated successfully.',
  });
});

export const resetTeacherPassword = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = resetPasswordSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Teacher not found.');

  const password = body.newPassword || crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  await logAudit(req, {
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    description: `Reset password for teacher "${existing.fullName}"`,
  });
  res.json({
    success: true,
    message: body.newPassword ? 'Password reset successfully.' : `New temporary password (shown once): ${password}`,
    temporaryPassword: body.newPassword ? undefined : password,
  });
});

export const deleteTeacher = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (req.user!.id === id) throw errors.badRequest('You cannot delete your own account.');

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw errors.notFound('Teacher not found.');

  await prisma.user.delete({ where: { id } });
  await logAudit(req, {
    action: 'DELETE',
    entityType: 'User',
    entityId: id,
    description: `Deleted teacher "${existing.fullName}"`,
  });
  res.json({ success: true, message: 'Teacher deleted successfully.' });
});
