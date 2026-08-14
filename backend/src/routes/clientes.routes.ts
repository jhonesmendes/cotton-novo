import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/clientes.controller';

export const clientesRouter = Router();

clientesRouter.use(authenticate);

clientesRouter.get('/', listar);
clientesRouter.get('/:id', buscarPorId);
clientesRouter.post('/', criar);
clientesRouter.put('/:id', atualizar);
clientesRouter.delete('/:id', deletar);
