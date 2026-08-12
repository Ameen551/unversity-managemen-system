import { Router } from 'express';
import { getAuditLog, listActions, listAuditLogs, listEntityTypes } from '../controllers/audit.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin());

router.get('/', listAuditLogs);
router.get('/actions', listActions);
router.get('/entity-types', listEntityTypes);
router.get('/:id', getAuditLog);

export default router;
