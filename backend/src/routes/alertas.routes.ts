import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listarAlertas, historico, getConfig, salvarConfig, pendenciasFechamento } from '../controllers/alertas.controller';

export const alertasRouter = Router();

alertasRouter.use(authenticate);

alertasRouter.get('/', listarAlertas);
alertasRouter.get('/historico', historico);
alertasRouter.get('/pendencias-fechamento', pendenciasFechamento);
alertasRouter.get('/config', getConfig);
alertasRouter.put('/config', salvarConfig);
