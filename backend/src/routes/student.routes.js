import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', StudentController.getAll);
router.get('/ranking', StudentController.getRanking);
router.get('/:id', StudentController.getById);
router.get('/:id/profile', StudentController.getStudentProfile);
router.post('/', StudentController.create);
router.put('/:id', StudentController.update);
router.delete('/bulk', StudentController.bulkDelete);
router.delete('/:id', StudentController.delete);
router.post('/transition', StudentController.transition);
router.post('/bulk-transition', StudentController.bulkTransition);

export default router;
