import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import { getRelatorio, getFiltros } from '../controllers/relatorios.controller';

export const relatoriosRouter = Router();

relatoriosRouter.use(authenticate);
// Equipe interna (sem valores financeiros nos relatórios por enquanto).
relatoriosRouter.use(exigirPermissao('RELATORIOS', 'ver'));

relatoriosRouter.get('/filtros', getFiltros);
relatoriosRouter.get('/', getRelatorio);
