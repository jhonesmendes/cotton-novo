import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
liberacoesRouter.post('/', criar);
liberacoesRouter.put('/:id', atualizar);
liberacoesRouter.patch('/:id/status', atualizarStatus);
liberacoesRouter.delete('/:id', deletar);
