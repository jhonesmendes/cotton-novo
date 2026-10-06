import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listar, filtros, historicoLiberacao } from '../controllers/auditoria.controller';

export const auditoriaRouter = Router();

auditoriaRouter.use(authenticate);

// Histórico da carga aparece na tela da liberação para a equipe interna.
auditoriaRouter.get('/liberacao/:id', requireRole('ADMIN', 'OPERADOR', 'GESTOR_FILIAL', 'VISUALIZADOR'), historicoLiberacao);
// Log completo do sistema: só ADMIN.
auditoriaRouter.get('/filtros', requireRole('ADMIN'), filtros);
auditoriaRouter.get('/', requireRole('ADMIN'), listar);
