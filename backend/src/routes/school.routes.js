import { Router } from 'express';
import { SchoolController } from '../controllers/school.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/profile', SchoolController.getProfile);
router.put('/profile', SchoolController.updateProfile);

export default router;
