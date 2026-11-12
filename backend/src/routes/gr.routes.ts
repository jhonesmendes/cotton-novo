import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import { alterar, listar } from '../controllers/gr.controller';

export const grRouter = Router();

grRouter.use(authenticate);
// Perfil GR só alcança estas rotas (ver middleware/auth.ts); a operação também usa a tela.

grRouter.get('/veiculos', exigirPermissao('GR', 'ver'), listar);
grRouter.patch('/veiculos/:id', exigirPermissao('GR', 'alterar'), alterar);
