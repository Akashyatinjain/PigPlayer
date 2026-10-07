import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import { audioUpload } from '../middleware/upload.middleware';

const router = Router();

router.post(
  '/analyze',
  optionalAuth,
  audioUpload.single('audio'),
  UploadController.analyze
);

router.post(
  '/song',
  optionalAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

// Alias for bulk clients that POST /api/upload
router.post(
  '/',
  optionalAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/bulk',
  optionalAuth,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  UploadController.uploadSongFile
);

router.post(
  '/artwork',
  optionalAuth,
  audioUpload.single('cover'),
  UploadController.uploadArtwork
);

export default router;
