import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
} from '../validators/auth.validator';

const router = Router();

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/refresh', validateBody(refreshSchema), AuthController.refresh);
router.post('/logout', optionalAuth, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
