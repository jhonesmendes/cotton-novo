"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
exports.refreshToken = refreshToken;
exports.me = me;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'Senha muito curta'),
});
function signAccess(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });
}
function signRefresh(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
}
async function login(req, res) {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma_1.default.usuario.findUnique({ where: { email } });
    if (!user || !user.ativo) {
        throw new errorHandler_1.AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS');
    }
    const valid = await bcryptjs_1.default.compare(password, user.senhaHash);
    if (!valid) {
        throw new errorHandler_1.AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS');
    }
    await prisma_1.default.usuario.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
    });
    const payload = {
        id: user.id,
        email: user.email,
        perfil: user.perfil,
        clienteId: user.clienteId,
        filialId: user.filialId,
    };
    return res.json({
        accessToken: signAccess(payload),
        refreshToken: signRefresh({ id: user.id }),
        user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
    });
}
async function logout(_req, res) {
    return res.json({ message: 'Logout realizado' });
}
async function refreshToken(req, res) {
    const { refreshToken: token } = req.body;
    if (!token)
        throw new errorHandler_1.AppError('Refresh token obrigatório', 400);
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch {
        throw new errorHandler_1.AppError('Refresh token inválido', 401, 'INVALID_TOKEN');
    }
    const user = await prisma_1.default.usuario.findUnique({ where: { id: decoded.id } });
    if (!user || !user.ativo)
        throw new errorHandler_1.AppError('Usuário inativo', 401);
    const payload = {
        id: user.id,
        email: user.email,
        perfil: user.perfil,
        clienteId: user.clienteId,
        filialId: user.filialId,
    };
    return res.json({ accessToken: signAccess(payload) });
}
async function me(req, res) {
    const user = await prisma_1.default.usuario.findUnique({
        where: { id: req.user.id },
        select: { id: true, nome: true, email: true, perfil: true, ativo: true, lastLogin: true },
    });
    if (!user)
        throw new errorHandler_1.AppError('Usuário não encontrado', 404);
    return res.json(user);
}
//# sourceMappingURL=auth.controller.js.map