import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/student', ReportController.studentReport);
router.get('/class', ReportController.classReport);
router.get('/performance-table', ReportController.performanceTable);
router.get('/subject-averages', ReportController.subjectAverages);

export default router;
