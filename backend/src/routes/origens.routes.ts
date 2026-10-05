import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/origens.controller';

export const origensRouter = Router();

origensRouter.use(authenticate);

origensRouter.get('/', listar);
origensRouter.get('/:id', buscarPorId);
origensRouter.post('/', requireRole('ADMIN'), criar);
origensRouter.put('/:id', requireRole('ADMIN'), atualizar);
origensRouter.delete('/:id', requireRole('ADMIN'), deletar);
