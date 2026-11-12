import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  aceitarConvite, cancelar, convidar, dadosConvite, excluir, gerarLink, limparEncerrados, listar, posicaoPorLink, posicaoVisitante, reenviar,
} from '../controllers/acessos-cliente.controller';

// Gestão dos acessos — só ADMIN.
export const acessosClienteRouter = Router();
acessosClienteRouter.use(authenticate, requireRole('ADMIN'));
acessosClienteRouter.get('/', listar);
acessosClienteRouter.post('/link', gerarLink);
acessosClienteRouter.post('/convite', convidar);
acessosClienteRouter.post('/:id/reenviar', reenviar);
acessosClienteRouter.post('/limpar-encerrados', limparEncerrados);
acessosClienteRouter.delete('/:id', cancelar);
acessosClienteRouter.delete('/:id/registro', excluir);

// Sem login: link temporário e cadastro pelo convite (o token é a credencial).
export const publicoRouter = Router();
publicoRouter.get('/posicao/:token', posicaoPorLink);
publicoRouter.get('/convite/:token', dadosConvite);
publicoRouter.post('/convite/:token', aceitarConvite);

// Visitante logado: a posição do cliente dele.
export const posicaoClienteRouter = Router();
posicaoClienteRouter.get('/', authenticate, requireRole('VISITANTE'), posicaoVisitante);
