import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/origens.controller';

export const origensRouter = Router();

origensRouter.use(authenticate);

origensRouter.get('/', listar);
origensRouter.get('/:id', buscarPorId);
origensRouter.post('/', criar);
origensRouter.put('/:id', atualizar);
origensRouter.delete('/:id', deletar);
