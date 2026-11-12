import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  sincronizarVinculos,
} from '../controllers/modelos.controller';

export const modelosRouter = Router();

modelosRouter.use(authenticate);

modelosRouter.get('/', listar);
modelosRouter.post('/sincronizar-vinculos', exigirPermissao('CADASTROS', 'alterar'), sincronizarVinculos);
modelosRouter.get('/:id', buscarPorId);
modelosRouter.post('/', exigirPermissao('CADASTROS', 'incluir'), criar);
modelosRouter.put('/:id', exigirPermissao('CADASTROS', 'alterar'), atualizar);
modelosRouter.delete('/:id', exigirPermissao('CADASTROS', 'excluir'), deletar);
