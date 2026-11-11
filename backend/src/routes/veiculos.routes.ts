import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  buscarPorPlaca,
  buscarMotoristaPorCpf,
  criar,
  atualizar,
  deletar,
  reativar,
} from '../controllers/veiculos.controller';

export const veiculosRouter = Router();

veiculosRouter.use(authenticate);

veiculosRouter.get('/', listar);
veiculosRouter.get('/placa/:placa', buscarPorPlaca);
veiculosRouter.get('/motorista/cpf/:cpf', buscarMotoristaPorCpf);
veiculosRouter.get('/:id', buscarPorId);
veiculosRouter.post('/', criar);
veiculosRouter.put('/:id', atualizar);
// Excluir = inativar com motivo (não apaga). Perfis só-leitura não inativam.
veiculosRouter.delete('/:id', requireRole('ADMIN', 'OPERADOR', 'GESTOR_FILIAL'), deletar);
veiculosRouter.post('/:id/reativar', requireRole('ADMIN'), reativar);
