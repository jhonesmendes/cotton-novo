import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/clientes.controller';

export const clientesRouter = Router();

clientesRouter.use(authenticate);

clientesRouter.get('/', listar);
clientesRouter.get('/:id', buscarPorId);
clientesRouter.post('/', exigirPermissao('CADASTROS', 'incluir'), criar);
clientesRouter.put('/:id', exigirPermissao('CADASTROS', 'alterar'), atualizar);
clientesRouter.delete('/:id', exigirPermissao('CADASTROS', 'excluir'), deletar);
