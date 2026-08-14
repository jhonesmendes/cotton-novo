import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listar,
  buscarPorId,
  buscarPorPlaca,
  buscarMotoristaPorCpf,
  criar,
  atualizar,
  deletar,
} from '../controllers/veiculos.controller';

export const veiculosRouter = Router();

veiculosRouter.use(authenticate);

veiculosRouter.get('/', listar);
veiculosRouter.get('/placa/:placa', buscarPorPlaca);
veiculosRouter.get('/motorista/cpf/:cpf', buscarMotoristaPorCpf);
veiculosRouter.get('/:id', buscarPorId);
veiculosRouter.post('/', criar);
veiculosRouter.put('/:id', atualizar);
veiculosRouter.delete('/:id', deletar);
