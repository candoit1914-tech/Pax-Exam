import { Router } from 'express';
import { AdminStudentCodeController } from '../controllers/adminStudentCode.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);
router.use(authorize('super_admin', 'school_admin'));

// Generate login code for a single student
router.post('/generate', AdminStudentCodeController.generateCode);

// Generate login codes in bulk (by class or all)
router.post('/generate-bulk', AdminStudentCodeController.generateBulkCodes);

// Get all students with their login codes
router.get('/', AdminStudentCodeController.getStudentCodes);

// Regenerate a student's login code
router.put('/:studentId/regenerate', AdminStudentCodeController.regenerateCode);

export default router;
