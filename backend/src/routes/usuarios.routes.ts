import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listar, criar, atualizar, deletar } from '../controllers/usuarios.controller';
import { PerfilUsuario } from '@prisma/client';

export const usuariosRouter = Router();

usuariosRouter.use(authenticate);
usuariosRouter.use(requireRole(PerfilUsuario.ADMIN));

usuariosRouter.get('/', listar);
usuariosRouter.post('/', criar);
usuariosRouter.put('/:id', atualizar);
usuariosRouter.delete('/:id', deletar);
