import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getRelatorio, getFiltros } from '../controllers/relatorios.controller';

export const relatoriosRouter = Router();

relatoriosRouter.use(authenticate);
// Equipe interna (sem valores financeiros nos relatórios por enquanto).
relatoriosRouter.use(requireRole('ADMIN', 'GESTOR_FILIAL', 'OPERADOR', 'VISUALIZADOR'));

relatoriosRouter.get('/filtros', getFiltros);
relatoriosRouter.get('/', getRelatorio);
