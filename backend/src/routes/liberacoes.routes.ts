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
  excluirReferencia,
  usoReferencia,
  finalizarManual,
} from '../controllers/liberacoes.controller';

export const liberacoesRouter = Router();

liberacoesRouter.use(authenticate);

liberacoesRouter.get('/', listar);
liberacoesRouter.get('/referencias/lista', referencias);
liberacoesRouter.patch('/referencias', atualizarReferencia);
liberacoesRouter.post('/referencias', criarReferencia);
liberacoesRouter.get('/referencias/uso', usoReferencia);
liberacoesRouter.delete('/referencias', requireRole('ADMIN'), excluirReferencia);
liberacoesRouter.get('/:id', buscarPorId);
// Operador edita cargas (veículos, status) nas outras rotas, mas não
// cria/edita a Liberação em si.
liberacoesRouter.post('/', requireRole('ADMIN', 'GESTOR_FILIAL'), criar);
liberacoesRouter.put('/:id', requireRole('ADMIN', 'GESTOR_FILIAL'), atualizar);
// Troca direta de status passa por cima da regra de conclusão (saldo de fardos) — só ADMIN.
liberacoesRouter.patch('/:id/status', requireRole('ADMIN'), atualizarStatus);
liberacoesRouter.post('/:id/finalizar', requireRole('ADMIN'), finalizarManual);
liberacoesRouter.delete('/:id', deletar);
