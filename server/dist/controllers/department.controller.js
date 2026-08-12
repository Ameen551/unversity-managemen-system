import { z } from 'zod';
import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { logAudit } from '../services/audit.service';
import { isAdminRole } from '../config/env';
const departmentSchema = z.object({
    name: z.string().min(2, 'Department name must be at least 2 characters.'),
    code: z
        .string()
        .min(1, 'Department code is required.')
        .max(20)
        .transform((v) => v.toUpperCase().trim()),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});
const departmentUpdateSchema = departmentSchema.partial();
export const listDepartments = asyncHandler(async (req, res) => {
    const includeInactive = isAdminRole(req.user.role) && req.query.all === 'true';
    const departments = await prisma.department.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { students: true, subjects: true, semesters: true } } },
    });
    res.json({ success: true, items: departments });
});
export const getDepartment = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const department = await prisma.department.findUnique({
        where: { id },
        include: { _count: { select: { students: true, subjects: true, semesters: true, users: true } } },
    });
    if (!department)
        throw errors.notFound('Department not found.');
    res.json({ success: true, item: department });
});
export const createDepartment = asyncHandler(async (req, res) => {
    const data = departmentSchema.parse(req.body);
    const existing = await prisma.department.findUnique({ where: { code: data.code } });
    if (existing)
        throw errors.conflict(`A department with code "${data.code}" already exists.`);
    const department = await prisma.department.create({
        data: {
            name: data.name,
            code: data.code,
            description: data.description ?? null,
            isActive: data.isActive ?? true,
            sortOrder: data.sortOrder ?? 0,
        },
    });
    await logAudit(req, {
        action: 'CREATE',
        entityType: 'Department',
        entityId: department.id,
        description: `Created department "${department.name}"`,
    });
    res.status(201).json({ success: true, item: department, message: 'Department created successfully.' });
});
export const updateDepartment = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = departmentUpdateSchema.parse(req.body);
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Department not found.');
    if (data.code) {
        const clash = await prisma.department.findFirst({ where: { code: data.code, id: { not: id } } });
        if (clash)
            throw errors.conflict(`A department with code "${data.code}" already exists.`);
    }
    const department = await prisma.department.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            description: data.description,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
        },
    });
    await logAudit(req, {
        action: 'UPDATE',
        entityType: 'Department',
        entityId: id,
        description: `Updated department "${department.name}"`,
    });
    res.json({ success: true, item: department, message: 'Department updated successfully.' });
});
export const deleteDepartment = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing)
        throw errors.notFound('Department not found.');
    const counts = await prisma.student.count({ where: { departmentId: id } });
    if (counts > 0) {
        throw errors.conflict('This department has students. Deactivate it instead of deleting.');
    }
    await prisma.department.delete({ where: { id } });
    await logAudit(req, {
        action: 'DELETE',
        entityType: 'Department',
        entityId: id,
        description: `Deleted department "${existing.name}"`,
    });
    res.json({ success: true, message: 'Department deleted successfully.' });
});
