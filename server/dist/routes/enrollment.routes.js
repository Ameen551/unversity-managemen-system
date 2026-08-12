import { Router } from 'express';
import { createEnrollment, deleteEnrollment, listEnrollments } from '../controllers/enrollment.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
const router = Router();
router.use(requireAuth);
router.get('/', listEnrollments);
router.post('/', createEnrollment);
router.delete('/:id', requireAdmin(), deleteEnrollment);
export default router;
