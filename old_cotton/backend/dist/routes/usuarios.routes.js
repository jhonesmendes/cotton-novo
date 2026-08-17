"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuariosRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const usuarios_controller_1 = require("../controllers/usuarios.controller");
const client_1 = require("@prisma/client");
exports.usuariosRouter = (0, express_1.Router)();
exports.usuariosRouter.use(auth_1.authenticate);
exports.usuariosRouter.use((0, auth_1.requireRole)(client_1.PerfilUsuario.ADMIN));
exports.usuariosRouter.get('/', usuarios_controller_1.listar);
exports.usuariosRouter.post('/', usuarios_controller_1.criar);
exports.usuariosRouter.put('/:id', usuarios_controller_1.atualizar);
exports.usuariosRouter.delete('/:id', usuarios_controller_1.deletar);
//# sourceMappingURL=usuarios.routes.js.map