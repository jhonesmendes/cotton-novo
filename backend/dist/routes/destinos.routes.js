"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const destinos_controller_1 = require("../controllers/destinos.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', destinos_controller_1.listar);
router.get('/:id', destinos_controller_1.buscarPorId);
// Apenas administradores e operadores podem gerenciar
router.use((0, auth_1.requireRole)('ADMIN', 'OPERADOR'));
router.post('/', destinos_controller_1.criar);
router.put('/:id', destinos_controller_1.atualizar);
router.delete('/:id', destinos_controller_1.deletar);
exports.default = router;
//# sourceMappingURL=destinos.routes.js.map