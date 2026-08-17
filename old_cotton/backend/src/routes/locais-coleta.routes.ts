import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/locais-coleta.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listar);
router.get('/:id', buscarPorId);

// Apenas administradores e operadores podem gerenciar
router.use(requireRole('ADMIN', 'OPERADOR'));
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', deletar);

export default router;
