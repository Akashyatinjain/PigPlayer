import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { requireMutationAuth } from '../middleware/auth.middleware';
import { audioUpload } from '../middleware/upload.middleware';

const router = Router();

router.post(
  '/analyze',
  requireMutationAuth,
  audioUpload.single('audio'),
  UploadController.analyze
);

router.post(
  '/song',
  requireMutationAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

// Alias for bulk clients that POST /api/upload
router.post(
  '/',
  requireMutationAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/bulk',
  requireMutationAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/artwork',
  requireMutationAuth,
  audioUpload.single('cover'),
  UploadController.uploadArtwork
);

export default router;
