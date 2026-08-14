"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.veiculosRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const veiculos_controller_1 = require("../controllers/veiculos.controller");
exports.veiculosRouter = (0, express_1.Router)();
exports.veiculosRouter.use(auth_1.authenticate);
exports.veiculosRouter.get('/', veiculos_controller_1.listar);
exports.veiculosRouter.get('/placa/:placa', veiculos_controller_1.buscarPorPlaca);
exports.veiculosRouter.get('/:id', veiculos_controller_1.buscarPorId);
exports.veiculosRouter.post('/', veiculos_controller_1.criar);
exports.veiculosRouter.put('/:id', veiculos_controller_1.atualizar);
exports.veiculosRouter.delete('/:id', veiculos_controller_1.deletar);
//# sourceMappingURL=veiculos.routes.js.map