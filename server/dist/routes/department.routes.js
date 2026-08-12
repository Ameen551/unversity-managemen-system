import { Router } from 'express';
import { createDepartment, deleteDepartment, getDepartment, listDepartments, updateDepartment, } from '../controllers/department.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
const router = Router();
router.use(requireAuth);
router.get('/', listDepartments);
router.get('/:id', getDepartment);
// Admin-only management
router.post('/', requireAdmin(), createDepartment);
router.put('/:id', requireAdmin(), updateDepartment);
router.delete('/:id', requireAdmin(), deleteDepartment);
export default router;
