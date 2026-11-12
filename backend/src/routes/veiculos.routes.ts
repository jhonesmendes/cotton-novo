import { Router } from 'express';
import { authenticate, requireRole, exigirPermissao } from '../middleware/auth';
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

veiculosRouter.get('/', exigirPermissao('VEICULOS', 'ver'), listar);
veiculosRouter.get('/placa/:placa', exigirPermissao('VEICULOS', 'ver'), buscarPorPlaca);
veiculosRouter.get('/motorista/cpf/:cpf', exigirPermissao('VEICULOS', 'ver'), buscarMotoristaPorCpf);
veiculosRouter.get('/:id', exigirPermissao('VEICULOS', 'ver'), buscarPorId);
veiculosRouter.post('/', exigirPermissao('VEICULOS', 'incluir'), criar);
veiculosRouter.put('/:id', exigirPermissao('VEICULOS', 'alterar'), atualizar);
// Excluir = inativar com motivo (não apaga). Perfis só-leitura não inativam.
veiculosRouter.delete('/:id', exigirPermissao('VEICULOS', 'excluir'), deletar);
veiculosRouter.post('/:id/reativar', requireRole('ADMIN'), reativar);
