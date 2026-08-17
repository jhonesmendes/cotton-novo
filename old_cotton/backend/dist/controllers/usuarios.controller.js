"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const prisma_types_1 = require("../types/prisma-types");
const schema = zod_1.z.object({
    nome: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    senha: zod_1.z.string().min(8).optional(),
    telefone: zod_1.z.string().optional(),
    perfil: zod_1.z.nativeEnum(prisma_types_1.PerfilUsuario),
    clienteId: zod_1.z.number().int().positive().optional().nullable(),
    filialId: zod_1.z.number().int().positive().optional().nullable(),
    ativo: zod_1.z.boolean().default(true),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nome: { contains: busca } },
            { email: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.usuario.count({ where }),
        prisma_1.default.usuario.findMany({
            where,
            select: {
                id: true, nome: true, email: true, perfil: true, ativo: true,
                telefone: true, lastLogin: true, createdAt: true,
                cliente: { select: { id: true, nome: true } },
                filial: { select: { id: true, nome: true } },
            },
            orderBy: { nome: 'asc' },
            skip,
            take,
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function criar(req, res) {
    const data = schema.parse(req.body);
    if (!data.senha)
        throw new errorHandler_1.AppError('Senha obrigatória ao criar usuário', 400);
    const senhaHash = await bcryptjs_1.default.hash(data.senha, 12);
    const { senha, ...rest } = data;
    const usuario = await prisma_1.default.usuario.create({
        data: { ...rest, senhaHash },
        select: { id: true, nome: true, email: true, perfil: true },
    });
    return res.status(201).json(usuario);
}
async function atualizar(req, res) {
    const { id } = req.params;
    const data = schema.partial().parse(req.body);
    const updateData = { ...data };
    if (data.senha) {
        updateData.senhaHash = await bcryptjs_1.default.hash(data.senha, 12);
        delete updateData.senha;
    }
    const usuario = await prisma_1.default.usuario.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });
    return res.json(usuario);
}
async function deletar(req, res) {
    await prisma_1.default.usuario.update({
        where: { id: parseInt(req.params.id) },
        data: { ativo: false },
    });
    return res.json({ message: 'Usuário desativado' });
}
//# sourceMappingURL=usuarios.controller.js.map