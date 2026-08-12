import type { Request } from 'express';
import { prisma } from '../config/db';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | number;
  description?: string;
  meta?: unknown;
}

/**
 * Records an auditable action. Never throws — audit failure must not break
 * the primary request.
 */
export async function logAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        userRole: req.user?.role ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId != null ? String(entry.entityId) : null,
        description: entry.description ?? null,
        meta: entry.meta != null ? JSON.stringify(entry.meta) : null,
        ipAddress: req.ip ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err);
  }
}
