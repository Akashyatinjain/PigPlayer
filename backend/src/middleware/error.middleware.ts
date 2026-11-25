import { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  let status = 500;
  let message = 'An unexpected server error occurred.';
  if (error instanceof AppError) {
    status = error.statusCode;
    message = error.message;
  } else if (error?.code === 'P2002') {
    status = 409;
    message = 'Resource already exists.';
  } else if (error?.code === 'P2025') {
    status = 404;
    message = 'Record not found.';
  } else if (error?.code === 'P2003') {
    status = 400;
    message = 'Referenced entity not found.';
  } else if (error?.code === 'P2024' || error?.code === 'P2034') {
    status = 503;
    message = 'The database is busy. Try again.';
  } else if (error?.name === 'MulterError') {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = status === 413 ? 'File exceeds the maximum upload size.' : 'Invalid multipart upload.';
  } else if (error?.status === 413) {
    status = 413;
    message = 'Request body exceeds the maximum size.';
  } else if (error?.status === 415) {
    status = 415;
    message = 'Unsupported request encoding.';
  } else if (error?.status === 400) {
    status = 400;
    message = 'Invalid request.';
  }

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    logger.error('API request failed', {
      method: req.method,
      status,
      code: typeof error?.code === 'string' && /^P\d{4}$/.test(error.code) ? error.code : undefined,
    });
  }
  res.status(status).json({ success: false, message });
};
