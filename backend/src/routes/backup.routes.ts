import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, BackupController.list);
router.post('/', optionalAuth, BackupController.create);
router.post('/restore', optionalAuth, BackupController.restore);
router.get('/export', optionalAuth, BackupController.exportLibrary);
router.post('/import', optionalAuth, BackupController.importLibrary);

export default router;
