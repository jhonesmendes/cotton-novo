import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listar, minhas, restaurar, salvar } from '../controllers/permissoes.controller';

export const permissoesRouter = Router();

permissoesRouter.use(authenticate);
permissoesRouter.get('/minhas', minhas);
// Editar permissões é sempre só do Administrador.
permissoesRouter.get('/', requireRole('ADMIN'), listar);
permissoesRouter.put('/', requireRole('ADMIN'), salvar);
permissoesRouter.post('/:perfil/restaurar', requireRole('ADMIN'), restaurar);
