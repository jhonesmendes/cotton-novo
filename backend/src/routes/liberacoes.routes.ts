import { Router } from 'express';
import { authenticate, requireRole, exigirPermissao } from '../middleware/auth';
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
  suspender,
  reativarSuspensa,
  exportarViagens,
} from '../controllers/liberacoes.controller';

export const liberacoesRouter = Router();

liberacoesRouter.use(authenticate);

liberacoesRouter.get('/', exigirPermissao('LIBERACOES', 'ver'), listar);
liberacoesRouter.get('/referencias/lista', referencias);
liberacoesRouter.patch('/referencias', exigirPermissao('CADASTROS', 'alterar'), atualizarReferencia);
liberacoesRouter.post('/referencias', exigirPermissao('CADASTROS', 'incluir'), criarReferencia);
liberacoesRouter.get('/referencias/uso', exigirPermissao('CADASTROS', 'ver'), usoReferencia);
liberacoesRouter.delete('/referencias', exigirPermissao('CADASTROS', 'excluir'), excluirReferencia);
liberacoesRouter.get('/viagens/exportar', exigirPermissao('CADASTROS', 'ver'), exportarViagens);
liberacoesRouter.get('/:id', exigirPermissao('LIBERACOES', 'ver'), buscarPorId);
// Operador edita cargas (veículos, status) nas outras rotas, mas não
// cria/edita a Liberação em si.
liberacoesRouter.post('/', exigirPermissao('LIBERACOES', 'incluir'), criar);
liberacoesRouter.put('/:id', exigirPermissao('LIBERACOES', 'alterar'), atualizar);
// Troca direta de status passa por cima da regra de conclusão (saldo de fardos) — só ADMIN.
liberacoesRouter.patch('/:id/status', requireRole('ADMIN'), atualizarStatus);
liberacoesRouter.post('/:id/finalizar', requireRole('ADMIN'), finalizarManual);
// Suspender/reativar: quem pode editar a liberação (motivo obrigatório para suspender).
liberacoesRouter.post('/:id/suspender', exigirPermissao('LIBERACOES', 'alterar'), suspender);
liberacoesRouter.post('/:id/reativar', exigirPermissao('LIBERACOES', 'alterar'), reativarSuspensa);
// Excluir = cancelar a liberação (antes ficava aberto a qualquer usuário logado).
liberacoesRouter.delete('/:id', exigirPermissao('LIBERACOES', 'excluir'), deletar);
