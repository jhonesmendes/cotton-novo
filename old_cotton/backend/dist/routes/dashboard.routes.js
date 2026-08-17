"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.use(auth_1.authenticate);
exports.dashboardRouter.get('/resumo', dashboard_controller_1.getResumo);
exports.dashboardRouter.get('/veiculos-vencendo', dashboard_controller_1.getVeiculosVencendo);
exports.dashboardRouter.get('/kpis', dashboard_controller_1.getKPIs);
//# sourceMappingURL=dashboard.routes.js.map