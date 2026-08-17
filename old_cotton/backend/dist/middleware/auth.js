"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new errorHandler_1.AppError('Token de acesso necessário', 401, 'UNAUTHORIZED');
    }
    const token = authHeader.substring(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        throw new errorHandler_1.AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN');
    }
}
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new errorHandler_1.AppError('Não autenticado', 401, 'UNAUTHORIZED');
        }
        if (!roles.includes(req.user.perfil)) {
            throw new errorHandler_1.AppError('Acesso negado', 403, 'FORBIDDEN');
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map