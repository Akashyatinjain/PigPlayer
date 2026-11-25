import { Router, json } from 'express';
import { z } from 'zod';
import { BackupController } from '../controllers/backup.controller';
import { requireProductionAdmin } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

router.use(requireProductionAdmin);
router.get('/', BackupController.list);
router.post('/', validateBody(z.object({ includeMedia: z.boolean().optional() })), BackupController.create);
router.post('/restore', validateBody(z.object({
  fileName: z.string().trim().min(1).max(200),
  confirmReplace: z.boolean().optional(),
})), BackupController.restore);
router.get('/export', BackupController.exportLibrary);
router.post('/import', json({ limit: '50mb', inflate: false }), validateBody(z.looseObject({
  mode: z.enum(['merge', 'replace']).optional(),
  library: z.record(z.string(), z.unknown()).optional(),
})), BackupController.importLibrary);

export default router;
