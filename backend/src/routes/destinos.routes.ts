import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/destinos.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listar);
router.get('/:id', buscarPorId);

// Apenas administradores, operadores e gestores de filial podem gerenciar
router.use(requireRole('ADMIN', 'OPERADOR', 'GESTOR_FILIAL'));
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', deletar);

export default router;
