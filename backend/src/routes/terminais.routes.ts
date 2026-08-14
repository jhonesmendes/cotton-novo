import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
terminaisRouter.post('/', criar);
terminaisRouter.put('/:id', atualizar);
terminaisRouter.delete('/:id', deletar);
