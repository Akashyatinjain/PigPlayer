import multer from 'multer';
import { AppError } from './error.middleware';
import { config } from '../config/env';
import { RequestHandler } from 'express';

const storage = multer.memoryStorage();
let activeUploads = 0;
export const limitConcurrentUploads: RequestHandler = (_req, res, next) => {
  if (activeUploads >= 3) {
    res.setHeader('Retry-After', '2');
    return next(new AppError('Uploads are busy. Try again shortly.', 429));
  }
  activeUploads++;
  res.once('close', () => { activeUploads--; });
  next();
};

const allowedAudioMimes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a',
];

const allowedImageMimes = [
  'image/jpeg', 'image/gif',
  'image/png',
  'image/webp',
  'image/jpg',
];

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
    files: 2,
    fields: 32,
    fieldSize: 2048,
    parts: 34,
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (allowedAudioMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        return cb(null, true);
      }
      return cb(new AppError('Invalid audio file format. Supported: MP3, WAV, FLAC, M4A, OGG, AAC.', 400));
    }
    if (file.fieldname === 'cover') {
      if (allowedImageMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        return cb(null, true);
      }
      return cb(new AppError('Invalid cover artwork format. Supported: JPEG, PNG, GIF, WebP.', 400));
    }
    cb(null, true);
  },
});
