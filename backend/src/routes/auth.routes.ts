import { Router } from 'express';
import { login, refreshToken, me, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refreshToken);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', authenticate, me);

