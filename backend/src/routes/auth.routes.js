import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authenticate, authorize('super_admin'), AuthController.register);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh', AuthController.refreshToken);
router.get('/me', authenticate, AuthController.me);

router.post('/create-teacher', authenticate, authorize('super_admin', 'school_admin'), AuthController.createTeacher);
router.put('/teacher/:id', authenticate, authorize('super_admin', 'school_admin'), AuthController.updateTeacher);
router.delete('/teacher/:id', authenticate, authorize('super_admin', 'school_admin'), AuthController.deleteTeacher);
router.put('/teacher/:id/reset-password', authenticate, authorize('super_admin', 'school_admin'), AuthController.resetTeacherPassword);
router.get('/teachers', authenticate, authorize('super_admin', 'school_admin'), AuthController.listTeacherUsers);

router.put('/profile', authenticate, AuthController.updateProfile);
router.put('/password', authenticate, AuthController.changePassword);

export default router;
