"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminaisRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const terminais_controller_1 = require("../controllers/terminais.controller");
exports.terminaisRouter = (0, express_1.Router)();
exports.terminaisRouter.use(auth_1.authenticate);
exports.terminaisRouter.get('/', terminais_controller_1.listar);
exports.terminaisRouter.get('/simples/lista', terminais_controller_1.listarSimples);
exports.terminaisRouter.get('/:id', terminais_controller_1.buscarPorId);
exports.terminaisRouter.post('/', terminais_controller_1.criar);
exports.terminaisRouter.put('/:id', terminais_controller_1.atualizar);
exports.terminaisRouter.delete('/:id', terminais_controller_1.deletar);
//# sourceMappingURL=terminais.routes.js.map