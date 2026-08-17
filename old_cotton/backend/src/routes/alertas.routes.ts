import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listarAlertas, historico, getConfig, salvarConfig } from '../controllers/alertas.controller';

export const alertasRouter = Router();

alertasRouter.use(authenticate);

alertasRouter.get('/', listarAlertas);
alertasRouter.get('/historico', historico);
alertasRouter.get('/config', getConfig);
alertasRouter.put('/config', salvarConfig);
