"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refreshToken = refreshToken;
exports.getProfile = getProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const sqlite3_1 = __importDefault(require("sqlite3"));
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
    const db = new sqlite3_1.default.Database('./dev.db');
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email], async (err, user) => {
            if (err) {
                db.close();
                reject(new errorHandler_1.AppError('Erro interno do servidor', 500));
                return;
            }
            if (!user) {
                db.close();
                reject(new errorHandler_1.AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS'));
                return;
            }
            const valid = await bcryptjs_1.default.compare(password, user.senha_hash);
            if (!valid) {
                db.close();
                reject(new errorHandler_1.AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS'));
                return;
            }
            // Atualizar lastLogin
            db.run('UPDATE usuarios SET updated_at = datetime("now") WHERE id = ?', [user.id], (err) => {
                db.close();
                if (err) {
                    console.error('Erro ao atualizar lastLogin:', err);
                }
                const payload = {
                    id: user.id,
                    email: user.email,
                    perfil: user.perfil,
                    clienteId: null,
                    filialId: null,
                };
                const accessToken = signAccess(payload);
                const refreshToken = signRefresh(payload);
                res.json({
                    user: {
                        id: user.id,
                        nome: user.nome,
                        email: user.email,
                        perfil: user.perfil,
                    },
                    accessToken,
                    refreshToken,
                });
                resolve(null);
            });
        });
    });
}
async function refreshToken(req, res) {
    const payload = {
        id: req.user.id,
        email: req.user.email,
        perfil: req.user.perfil,
        clienteId: req.user.clienteId,
        filialId: req.user.filialId,
    };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);
    res.json({ accessToken, refreshToken });
}
async function getProfile(req, res) {
    const db = new sqlite3_1.default.Database('./dev.db');
    return new Promise((resolve, reject) => {
        db.get('SELECT id, nome, email, perfil, ativo, created_at, updated_at FROM usuarios WHERE id = ?', [req.user.id], (err, user) => {
            db.close();
            if (err || !user) {
                reject(new errorHandler_1.AppError('Usuário não encontrado', 404));
                return;
            }
            res.json({
                id: user.id,
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
                ativo: Boolean(user.ativo),
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            });
            resolve(null);
        });
    });
}
//# sourceMappingURL=auth-simple.controller.js.map