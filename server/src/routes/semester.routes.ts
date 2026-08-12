import { Router } from 'express';
import {
  bulkCreateSemesters,
  createSemester,
  deleteSemester,
  getSemester,
  listSemesters,
  updateSemester,
} from '../controllers/semester.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listSemesters);
router.get('/:id', getSemester);
router.post('/', requireAdmin(), createSemester);
router.post('/bulk', requireAdmin(), bulkCreateSemesters);
router.put('/:id', requireAdmin(), updateSemester);
router.delete('/:id', requireAdmin(), deleteSemester);

export default router;
