import { Router } from 'express';
import { SchoolController } from '../controllers/school.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);

router.get('/profile', authorize('super_admin', 'school_admin', 'teacher'), SchoolController.getProfile);
router.put('/profile', authorize('super_admin', 'school_admin'), SchoolController.updateProfile);

export default router;
