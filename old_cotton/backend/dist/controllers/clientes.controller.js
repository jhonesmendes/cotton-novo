"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const criarSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido').optional().or(zod_1.z.literal('')),
    cnpj: zod_1.z.string().min(14, 'CNPJ inválido'),
    contatos: zod_1.z.string().optional(),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nome: { contains: busca } },
            { cnpj: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.cliente.count({ where }),
        prisma_1.default.cliente.findMany({
            where,
            select: { id: true, nome: true, email: true, cnpj: true },
            orderBy: { nome: 'asc' },
            skip,
            take,
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function buscarPorId(req, res) {
    const { id } = req.params;
    const cliente = await prisma_1.default.cliente.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, nome: true, email: true, cnpj: true },
    });
    if (!cliente)
        throw new errorHandler_1.AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    return res.json(cliente);
}
async function criar(req, res) {
    const data = criarSchema.parse(req.body);
    const existe = await prisma_1.default.cliente.findFirst({ where: { nome: { equals: data.nome } } });
    if (existe)
        throw new errorHandler_1.AppError(`Cliente "${data.nome}" já existe`, 409, 'DUPLICATE');
    const cliente = await prisma_1.default.cliente.create({ data });
    return res.status(201).json(cliente);
}
async function atualizar(req, res) {
    const { id } = req.params;
    const data = criarSchema.partial().parse(req.body);
    const cliente = await prisma_1.default.cliente.findUnique({ where: { id: parseInt(id) } });
    if (!cliente)
        throw new errorHandler_1.AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    const atualizado = await prisma_1.default.cliente.update({ where: { id: parseInt(id) }, data });
    return res.json(atualizado);
}
async function deletar(req, res) {
    const { id } = req.params;
    const cliente = await prisma_1.default.cliente.findUnique({ where: { id: parseInt(id) } });
    if (!cliente)
        throw new errorHandler_1.AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    const vinculadas = await prisma_1.default.liberacao.count({ where: { clienteId: parseInt(id) } });
    if (vinculadas > 0) {
        throw new errorHandler_1.AppError(`Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a este cliente`, 400, 'HAS_DEPENDENCIES');
    }
    await prisma_1.default.cliente.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Cliente excluído com sucesso' });
}
//# sourceMappingURL=clientes.controller.js.map