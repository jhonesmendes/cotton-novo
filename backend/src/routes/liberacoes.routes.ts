import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  atualizarStatus,
  referencias,
  atualizarReferencia,
  criarReferencia,
} from '../controllers/liberacoes.controller';

export const liberacoesRouter = Router();

liberacoesRouter.use(authenticate);

liberacoesRouter.get('/', listar);
liberacoesRouter.get('/referencias/lista', referencias);
liberacoesRouter.patch('/referencias', atualizarReferencia);
liberacoesRouter.post('/referencias', criarReferencia);
liberacoesRouter.get('/:id', buscarPorId);
// Operador edita cargas (veículos, status) nas outras rotas, mas não
// cria/edita a Liberação em si.
liberacoesRouter.post('/', requireRole('ADMIN', 'GESTOR_FILIAL'), criar);
liberacoesRouter.put('/:id', requireRole('ADMIN', 'GESTOR_FILIAL'), atualizar);
liberacoesRouter.patch('/:id/status', atualizarStatus);
liberacoesRouter.delete('/:id', deletar);
