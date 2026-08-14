import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getResumo, getVeiculosVencendo, getKPIs } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/resumo', getResumo);
dashboardRouter.get('/veiculos-vencendo', getVeiculosVencendo);
dashboardRouter.get('/kpis', getKPIs);
