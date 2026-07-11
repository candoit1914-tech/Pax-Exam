import { Router } from 'express';
import { StudentAuthController } from '../controllers/studentAuth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Student login with special code (unauthenticated)
router.post('/login', StudentAuthController.login);

// Student token refresh (unauthenticated)
router.post('/refresh', StudentAuthController.refreshToken);

// Protected routes (require authentication)
router.get('/me', authenticate, StudentAuthController.me);
router.get('/scores/:studentId', authenticate, StudentAuthController.getStudentScores);
router.get('/profile/:studentId', authenticate, StudentAuthController.getStudentProfile);

export default router;
