import { Router } from 'express';
import { login, refreshToken, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refreshToken);
authRouter.get('/me', authenticate, me);

