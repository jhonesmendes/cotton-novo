import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import { getResumo, getVeiculosVencendo, getKPIs, getPainel } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.use(exigirPermissao('DASHBOARD', 'ver'));

dashboardRouter.get('/resumo', getResumo);
dashboardRouter.get('/veiculos-vencendo', getVeiculosVencendo);
dashboardRouter.get('/kpis', getKPIs);
dashboardRouter.get('/painel', getPainel);
