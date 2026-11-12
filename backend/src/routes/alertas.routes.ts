import { Router } from 'express';
import { authenticate, exigirPermissao } from '../middleware/auth';
import { listarAlertas, historico, getConfig, salvarConfig, pendenciasFechamento } from '../controllers/alertas.controller';

export const alertasRouter = Router();

alertasRouter.use(authenticate);

alertasRouter.get('/', exigirPermissao('ALERTAS', 'ver'), listarAlertas);
alertasRouter.get('/historico', exigirPermissao('ALERTAS', 'ver'), historico);
alertasRouter.get('/pendencias-fechamento', exigirPermissao('ALERTAS', 'ver'), pendenciasFechamento);
alertasRouter.get('/config', exigirPermissao('ALERTAS', 'ver'), getConfig);
alertasRouter.put('/config', exigirPermissao('ALERTAS', 'alterar'), salvarConfig);
