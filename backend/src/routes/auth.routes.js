import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authenticate, AuthController.register);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh', AuthController.refreshToken);
router.get('/me', authenticate, AuthController.me);

export default router;
