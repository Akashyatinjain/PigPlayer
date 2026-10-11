import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthRequest, AuthUser } from '../types';
import { AppError } from './error.middleware';

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing token.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please refresh session.', 401));
    }
    return next(new AppError('Invalid or corrupted token.', 401));
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    req.user = decoded;
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
};

/** Keep guest editing available for local development, but require identity on a deployed API. */
export const requireMutationAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (config.allowGuestMutations) {
    return optionalAuth(req, res, next);
  }
  if (config.env === 'production') {
    return authenticate(req, res, next);
  }
  return optionalAuth(req, res, next);
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (req.user.role !== role && req.user.role !== 'admin') {
      return next(new AppError('Forbidden: insufficient permissions.', 403));
    }
    next();
  };
};

/** Backups can export or replace the whole library, so production access is admin-only. */
export const requireProductionAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (config.env !== 'production') return next();
  return authenticate(req, res, (error?: unknown) => {
    if (error) return next(error);
    return requireRole('admin')(req, res, next);
  });
};
