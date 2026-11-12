import { Router } from 'express';
import { authenticate, requireRole, exigirPermissao } from '../middleware/auth';
import { listar, filtros, historicoLiberacao } from '../controllers/auditoria.controller';

export const auditoriaRouter = Router();

auditoriaRouter.use(authenticate);

// Histórico da carga aparece na tela da liberação para a equipe interna.
auditoriaRouter.get('/liberacao/:id', exigirPermissao('HISTORICO', 'ver'), historicoLiberacao);
// Log completo do sistema: só ADMIN.
auditoriaRouter.get('/filtros', requireRole('ADMIN'), filtros);
auditoriaRouter.get('/', requireRole('ADMIN'), listar);
