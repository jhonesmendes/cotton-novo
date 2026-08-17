import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
} from '../controllers/modelos.controller';

export const modelosRouter = Router();

modelosRouter.use(authenticate);

modelosRouter.get('/', listar);
modelosRouter.get('/:id', buscarPorId);
modelosRouter.post('/', criar);
modelosRouter.put('/:id', atualizar);
modelosRouter.delete('/:id', deletar);
