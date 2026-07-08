import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/student', authorize('super_admin', 'school_admin', 'teacher'), ReportController.studentReport);
router.get('/class', authorize('super_admin', 'school_admin', 'teacher'), ReportController.classReport);
router.get('/performance-table', authorize('super_admin', 'school_admin', 'teacher'), ReportController.performanceTable);
router.get('/subject-averages', authorize('super_admin', 'school_admin', 'teacher'), ReportController.subjectAverages);

export default router;
