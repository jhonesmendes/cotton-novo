"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelosRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const modelos_controller_1 = require("../controllers/modelos.controller");
exports.modelosRouter = (0, express_1.Router)();
exports.modelosRouter.use(auth_1.authenticate);
exports.modelosRouter.get('/', modelos_controller_1.listar);
exports.modelosRouter.post('/sincronizar-vinculos', modelos_controller_1.sincronizarVinculos);
exports.modelosRouter.get('/:id', modelos_controller_1.buscarPorId);
exports.modelosRouter.post('/', modelos_controller_1.criar);
exports.modelosRouter.put('/:id', modelos_controller_1.atualizar);
exports.modelosRouter.delete('/:id', modelos_controller_1.deletar);
//# sourceMappingURL=modelos.routes.js.map