"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liberacoesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const liberacoes_controller_1 = require("../controllers/liberacoes.controller");
exports.liberacoesRouter = (0, express_1.Router)();
exports.liberacoesRouter.use(auth_1.authenticate);
exports.liberacoesRouter.get('/', liberacoes_controller_1.listar);
exports.liberacoesRouter.get('/referencias/lista', liberacoes_controller_1.referencias);
exports.liberacoesRouter.patch('/referencias', liberacoes_controller_1.atualizarReferencia);
exports.liberacoesRouter.post('/referencias', liberacoes_controller_1.criarReferencia);
exports.liberacoesRouter.get('/:id', liberacoes_controller_1.buscarPorId);
exports.liberacoesRouter.post('/', liberacoes_controller_1.criar);
exports.liberacoesRouter.put('/:id', liberacoes_controller_1.atualizar);
exports.liberacoesRouter.patch('/:id/status', liberacoes_controller_1.atualizarStatus);
exports.liberacoesRouter.delete('/:id', liberacoes_controller_1.deletar);
//# sourceMappingURL=liberacoes.routes.js.map