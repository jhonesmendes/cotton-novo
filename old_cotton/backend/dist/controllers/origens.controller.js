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
    localizacao: zod_1.z.string().min(1, 'Localização é obrigatória'),
    estado: zod_1.z.string().min(2, 'Estado é obrigatório').max(2),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nome: { contains: busca } },
            { localizacao: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.origem.count({ where }),
        prisma_1.default.origem.findMany({
            where,
            select: { id: true, nome: true, localizacao: true, estado: true },
            orderBy: { nome: 'asc' },
            skip,
            take,
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function buscarPorId(req, res) {
    const { id } = req.params;
    const origem = await prisma_1.default.origem.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, nome: true, localizacao: true, estado: true },
    });
    if (!origem)
        throw new errorHandler_1.AppError('Origem não encontrada', 404, 'NOT_FOUND');
    return res.json(origem);
}
async function criar(req, res) {
    const data = criarSchema.parse(req.body);
    const existe = await prisma_1.default.origem.findFirst({
        where: { nome: { equals: data.nome } },
    });
    if (existe)
        throw new errorHandler_1.AppError(`Filial/Origem "${data.nome}" já existe`, 409, 'DUPLICATE');
    const origem = await prisma_1.default.origem.create({ data });
    return res.status(201).json(origem);
}
async function atualizar(req, res) {
    const { id } = req.params;
    const data = criarSchema.partial().parse(req.body);
    const origem = await prisma_1.default.origem.findUnique({ where: { id: parseInt(id) } });
    if (!origem)
        throw new errorHandler_1.AppError('Origem não encontrada', 404, 'NOT_FOUND');
    const atualizada = await prisma_1.default.origem.update({
        where: { id: parseInt(id) },
        data,
    });
    return res.json(atualizada);
}
async function deletar(req, res) {
    const { id } = req.params;
    const origem = await prisma_1.default.origem.findUnique({ where: { id: parseInt(id) } });
    if (!origem)
        throw new errorHandler_1.AppError('Origem não encontrada', 404, 'NOT_FOUND');
    const vinculadas = await prisma_1.default.liberacao.count({ where: { origemId: parseInt(id) } });
    if (vinculadas > 0) {
        throw new errorHandler_1.AppError(`Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a esta filial`, 400, 'HAS_DEPENDENCIES');
    }
    await prisma_1.default.origem.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'Filial/Origem excluída com sucesso' });
}
//# sourceMappingURL=origens.controller.js.map