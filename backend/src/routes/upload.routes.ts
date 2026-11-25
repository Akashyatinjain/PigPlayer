import { Router, json } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { requireMutationAuth } from '../middleware/auth.middleware';
import { audioUpload, limitConcurrentUploads } from '../middleware/upload.middleware';

const router = Router();
router.use(requireMutationAuth, limitConcurrentUploads);

router.post(
  '/analyze',
  audioUpload.single('audio'),
  UploadController.analyze
);

router.post(
  '/song',
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

// Alias for bulk clients that POST /api/upload
router.post(
  '/',
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/bulk',
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/artwork',
  json({ limit: '14mb', inflate: false }),
  audioUpload.single('cover'),
  UploadController.uploadArtwork
);

export default router;
