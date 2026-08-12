import { prisma } from '../config/db';
import { errors } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPagination, paginate } from '../utils/pagination';
export const listAuditLogs = asyncHandler(async (req, res) => {
    const q = req.query;
    const p = getPagination(q);
    const where = {};
    if (q.action)
        where.action = q.action;
    if (q.entityType)
        where.entityType = q.entityType;
    if (q.userRole)
        where.userRole = q.userRole;
    if (q.search) {
        where.description = { contains: q.search };
    }
    const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: p.skip,
            take: p.take,
            include: { user: { select: { id: true, fullName: true, username: true } } },
        }),
    ]);
    res.json({ success: true, ...paginate(items, total, p) });
});
export const listActions = asyncHandler(async (_req, res) => {
    const rows = await prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true } });
    res.json({ success: true, items: rows.map((r) => r.action).sort() });
});
export const listEntityTypes = asyncHandler(async (_req, res) => {
    const rows = await prisma.auditLog.groupBy({ by: ['entityType'], _count: { _all: true } });
    res.json({ success: true, items: rows.map((r) => r.entityType).sort() });
});
export const getAuditLog = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const log = await prisma.auditLog.findUnique({
        where: { id },
        include: { user: { select: { id: true, fullName: true, username: true } } },
    });
    if (!log)
        throw errors.notFound('Audit log entry not found.');
    res.json({ success: true, item: log });
});
