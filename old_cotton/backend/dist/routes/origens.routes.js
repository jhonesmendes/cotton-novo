"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.origensRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const origens_controller_1 = require("../controllers/origens.controller");
exports.origensRouter = (0, express_1.Router)();
exports.origensRouter.use(auth_1.authenticate);
exports.origensRouter.get('/', origens_controller_1.listar);
exports.origensRouter.get('/:id', origens_controller_1.buscarPorId);
exports.origensRouter.post('/', origens_controller_1.criar);
exports.origensRouter.put('/:id', origens_controller_1.atualizar);
exports.origensRouter.delete('/:id', origens_controller_1.deletar);
//# sourceMappingURL=origens.routes.js.map