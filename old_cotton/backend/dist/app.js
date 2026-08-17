"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = require("./routes/auth.routes");
const liberacoes_routes_1 = require("./routes/liberacoes.routes");
const veiculos_routes_1 = require("./routes/veiculos.routes");
const modelos_routes_1 = require("./routes/modelos.routes");
const terminais_routes_1 = require("./routes/terminais.routes");
const alertas_routes_1 = require("./routes/alertas.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const usuarios_routes_1 = require("./routes/usuarios.routes");
const clientes_routes_1 = require("./routes/clientes.routes");
const origens_routes_1 = require("./routes/origens.routes");
const destinos_routes_1 = __importDefault(require("./routes/destinos.routes"));
const locais_coleta_routes_1 = __importDefault(require("./routes/locais-coleta.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rotas
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/dashboard', dashboard_routes_1.dashboardRouter);
app.use('/api/liberacoes', liberacoes_routes_1.liberacoesRouter);
app.use('/api/veiculos', veiculos_routes_1.veiculosRouter);
app.use('/api/modelos', modelos_routes_1.modelosRouter);
app.use('/api/terminais', terminais_routes_1.terminaisRouter);
app.use('/api/alertas', alertas_routes_1.alertasRouter);
app.use('/api/usuarios', usuarios_routes_1.usuariosRouter);
app.use('/api/clientes', clientes_routes_1.clientesRouter);
app.use('/api/origens', origens_routes_1.origensRouter);
app.use('/api/destinos', destinos_routes_1.default);
app.use('/api/locais-coleta', locais_coleta_routes_1.default);
app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Cotton Backend rodando em http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map