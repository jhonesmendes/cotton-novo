import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listar, salvar } from '../controllers/parametros.controller';

export const parametrosRouter = Router();

parametrosRouter.use(authenticate);

parametrosRouter.get('/', listar);
parametrosRouter.put('/', requireRole('ADMIN'), salvar);
