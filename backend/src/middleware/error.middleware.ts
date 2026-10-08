import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  let message = err.message || 'Internal Server Error';

  // Map Prisma known error codes
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Resource already exists (duplicate entry).';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found.';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Referenced entity not found.';
  } else if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File size exceeds maximum allowed upload limit.';
    } else {
      statusCode = 400;
      message = err.message || 'File upload error.';
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
