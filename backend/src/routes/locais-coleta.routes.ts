import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/locais-coleta.controller';
import { authenticate, exigirPermissao } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listar);
router.get('/:id', buscarPorId);

// Apenas administradores, operadores e gestores de filial podem gerenciar
router.post('/', exigirPermissao('CADASTROS', 'incluir'), criar);
router.put('/:id', exigirPermissao('CADASTROS', 'alterar'), atualizar);
router.delete('/:id', exigirPermissao('CADASTROS', 'excluir'), deletar);

export default router;
