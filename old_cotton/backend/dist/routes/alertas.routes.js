"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertasRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const alertas_controller_1 = require("../controllers/alertas.controller");
exports.alertasRouter = (0, express_1.Router)();
exports.alertasRouter.use(auth_1.authenticate);
exports.alertasRouter.get('/', alertas_controller_1.listarAlertas);
exports.alertasRouter.get('/historico', alertas_controller_1.historico);
exports.alertasRouter.get('/config', alertas_controller_1.getConfig);
exports.alertasRouter.put('/config', alertas_controller_1.salvarConfig);
//# sourceMappingURL=alertas.routes.js.map