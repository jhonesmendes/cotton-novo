import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  listarSimples,
} from '../controllers/terminais.controller';

export const terminaisRouter = Router();

terminaisRouter.use(authenticate);

terminaisRouter.get('/', listar);
terminaisRouter.get('/simples/lista', listarSimples);
terminaisRouter.get('/:id', buscarPorId);
terminaisRouter.post('/', exigirPermissao('CADASTROS', 'incluir'), criar);
terminaisRouter.put('/:id', exigirPermissao('CADASTROS', 'alterar'), atualizar);
terminaisRouter.delete('/:id', exigirPermissao('CADASTROS', 'excluir'), deletar);
