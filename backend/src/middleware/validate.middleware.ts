import { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from './error.middleware';

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      return next(new AppError(`Validation failed: ${messages.join(', ')}`, 400));
    }
    req.body = parsed.data;
    next();
  };
}
