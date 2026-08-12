import { Router } from 'express';
import { dashboardStats } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/stats', dashboardStats);

export default router;
