import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { lerSmtp, removerSmtp, salvarSmtp, testarSmtpTela } from '../controllers/configuracoes.controller';

export const configuracoesRouter = Router();

configuracoesRouter.use(authenticate, requireRole('ADMIN'));
configuracoesRouter.get('/smtp', lerSmtp);
configuracoesRouter.put('/smtp', salvarSmtp);
configuracoesRouter.delete('/smtp', removerSmtp);
configuracoesRouter.post('/smtp/teste', testarSmtpTela);
