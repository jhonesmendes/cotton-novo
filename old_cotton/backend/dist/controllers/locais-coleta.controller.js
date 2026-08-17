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
    estado: zod_1.z.string().min(2, 'Estado (UF) é obrigatório').max(2),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nome: { contains: busca } },
            { cidade: { contains: busca } }, { estado: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.localColeta.count({ where }),
        prisma_1.default.localColeta.findMany({
            where,
            select: { id: true, nome: true, cidade: true, estado: true },
            orderBy: { nome: 'asc' },
            skip,
            take,
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function buscarPorId(req, res) {
    const { id } = req.params;
    const localColeta = await prisma_1.default.localColeta.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, nome: true, cidade: true, estado: true },
    });
    if (!localColeta)
        throw new errorHandler_1.AppError('localColeta não encontrado', 404, 'NOT_FOUND');
    return res.json(localColeta);
}
async function criar(req, res) {
    const data = criarSchema.parse(req.body);
    const existe = await prisma_1.default.localColeta.findFirst({
        where: { nome: { equals: data.nome } },
    });
    if (existe)
        throw new errorHandler_1.AppError(`localColeta "${data.nome}" já existe`, 409, 'DUPLICATE');
    const localColeta = await prisma_1.default.localColeta.create({ data });
    return res.status(201).json(localColeta);
}
async function atualizar(req, res) {
    const { id } = req.params;
    const data = criarSchema.partial().parse(req.body);
    const localColeta = await prisma_1.default.localColeta.findUnique({ where: { id: parseInt(id) } });
    if (!localColeta)
        throw new errorHandler_1.AppError('localColeta não encontrado', 404, 'NOT_FOUND');
    const atualizado = await prisma_1.default.localColeta.update({
        where: { id: parseInt(id) },
        data,
    });
    return res.json(atualizado);
}
async function deletar(req, res) {
    const { id } = req.params;
    const localColeta = await prisma_1.default.localColeta.findUnique({ where: { id: parseInt(id) } });
    if (!localColeta)
        throw new errorHandler_1.AppError('localColeta não encontrado', 404, 'NOT_FOUND');
    const vinculadas = await prisma_1.default.liberacao.count({ where: { localColetaId: parseInt(id) } });
    if (vinculadas > 0) {
        throw new errorHandler_1.AppError(`Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a este localColeta`, 400, 'HAS_DEPENDENCIES');
    }
    await prisma_1.default.localColeta.delete({ where: { id: parseInt(id) } });
    return res.json({ message: 'localColeta excluído com sucesso' });
}
//# sourceMappingURL=locais-coleta.controller.js.map