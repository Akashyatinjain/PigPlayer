import { NextFunction, Response } from 'express';
import { config } from '../config/env';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const token = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '')?.[1];
  if (!token) return next(new AppError('Authentication required.', 401));

  try {
    const { user, sessionId } = await AuthService.authenticate(token);
    req.user = user;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.headers.authorization) return authenticate(req, res, next);
  res.setHeader('Cache-Control', 'private, no-store');
  return next();
};

export const requireMutationAuth = (req: AuthRequest, res: Response, next: NextFunction) =>
  config.env !== 'production' && config.allowGuestMutations
    ? optionalAuth(req, res, next)
    : authenticate(req, res, next);

export const requireProductionAdmin = (req: AuthRequest, res: Response, next: NextFunction) =>
  authenticate(req, res, (error?: unknown) => {
    if (error) return next(error);
    return req.user?.role === 'admin'
      ? next()
      : next(new AppError('Forbidden: insufficient permissions.', 403));
  });
