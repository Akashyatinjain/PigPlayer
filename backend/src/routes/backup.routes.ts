import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { requireProductionAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireProductionAdmin, BackupController.list);
router.post('/', requireProductionAdmin, BackupController.create);
router.post('/restore', requireProductionAdmin, BackupController.restore);
router.get('/export', requireProductionAdmin, BackupController.exportLibrary);
router.post('/import', requireProductionAdmin, BackupController.importLibrary);

export default router;
