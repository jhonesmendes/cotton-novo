"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locais_coleta_controller_1 = require("../controllers/locais-coleta.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', locais_coleta_controller_1.listar);
router.get('/:id', locais_coleta_controller_1.buscarPorId);
// Apenas administradores e operadores podem gerenciar
router.use((0, auth_1.requireRole)('ADMIN', 'OPERADOR'));
router.post('/', locais_coleta_controller_1.criar);
router.put('/:id', locais_coleta_controller_1.atualizar);
router.delete('/:id', locais_coleta_controller_1.deletar);
exports.default = router;
//# sourceMappingURL=locais-coleta.routes.js.map