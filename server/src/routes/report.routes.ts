import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { exportAttendance, exportMarks, exportOverall, exportStudents } from '../controllers/report.controller';

const router = Router();

router.use(requireAuth);

router.get('/students', exportStudents);
router.get('/marks', exportMarks);
router.get('/attendance', exportAttendance);
router.get('/overall', exportOverall);

export default router;
