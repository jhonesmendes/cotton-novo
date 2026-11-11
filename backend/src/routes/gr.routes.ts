import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { alterar, listar } from '../controllers/gr.controller';

export const grRouter = Router();

grRouter.use(authenticate);
// Perfil GR só alcança estas rotas (ver middleware/auth.ts); a operação também usa a tela.
grRouter.use(requireRole('ADMIN', 'GESTOR_FILIAL', 'OPERADOR', 'GR'));

grRouter.get('/veiculos', listar);
grRouter.patch('/veiculos/:id', alterar);
