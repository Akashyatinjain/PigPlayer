import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .refine((password) => Buffer.byteLength(password) <= 72, 'Password must be 72 UTF-8 bytes or fewer'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required')
    .refine((password) => Buffer.byteLength(password) <= 72, 'Password must be 72 UTF-8 bytes or fewer'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').max(2048),
});
