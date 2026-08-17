"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const clientes_controller_1 = require("../controllers/clientes.controller");
exports.clientesRouter = (0, express_1.Router)();
exports.clientesRouter.use(auth_1.authenticate);
exports.clientesRouter.get('/', clientes_controller_1.listar);
exports.clientesRouter.get('/:id', clientes_controller_1.buscarPorId);
exports.clientesRouter.post('/', clientes_controller_1.criar);
exports.clientesRouter.put('/:id', clientes_controller_1.atualizar);
exports.clientesRouter.delete('/:id', clientes_controller_1.deletar);
//# sourceMappingURL=clientes.routes.js.map