import multer from 'multer';
import { AppError } from './error.middleware';
import { config } from '../config/env';

const storage = multer.memoryStorage();

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
  'image/jpeg',
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
    fieldSize: 1024 * 1024,
    parts: 34,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (allowedAudioMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        return cb(null, true);
      }
      return cb(new AppError('Invalid audio file format. Supported: MP3, WAV, FLAC, M4A, OGG, AAC.', 400));
    }
    if (file.fieldname === 'cover') {
      if (allowedImageMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return cb(null, true);
      }
      return cb(new AppError('Invalid cover artwork format. Supported: JPG, PNG, WEBP.', 400));
    }
    cb(null, true);
  },
});
