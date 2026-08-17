"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.sincronizarVinculos = sincronizarVinculos;
exports.deletar = deletar;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const schema = zod_1.z.object({
    nomeDescricao: zod_1.z.string().min(3),
    placaVeiculo: zod_1.z.string().optional(),
    motoristaNome: zod_1.z.string().optional(),
    motoristaTelefone: zod_1.z.string().optional(),
    capacidadeMaximaFardos: zod_1.z.number().int().nonnegative(),
    pesoMaximoKg: zod_1.z.number().int().nonnegative(),
    comprimentoM: zod_1.z.number().positive().optional(),
    larguraM: zod_1.z.number().positive().optional(),
    alturaM: zod_1.z.number().positive().optional(),
    caracteristicasEspeciais: zod_1.z.string().optional(),
    observacoes: zod_1.z.string().optional(),
    ativo: zod_1.z.boolean().default(true),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nomeDescricao: { contains: busca } },
            { motoristaNome: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.modeloCarreta.count({ where }),
        prisma_1.default.modeloCarreta.findMany({
            where,
            orderBy: { nomeDescricao: 'asc' },
            skip,
            take,
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function buscarPorId(req, res) {
    const modelo = await prisma_1.default.modeloCarreta.findUnique({
        where: { id: parseInt(req.params.id) },
    });
    if (!modelo)
        throw new errorHandler_1.AppError('Modelo não encontrado', 404);
    return res.json(modelo);
}
async function criar(req, res) {
    const data = schema.parse(req.body);
    const modelo = await prisma_1.default.modeloCarreta.create({ data });
    return res.status(201).json(modelo);
}
async function atualizar(req, res) {
    const data = schema.partial().parse(req.body);
    const modelo = await prisma_1.default.modeloCarreta.update({
        where: { id: parseInt(req.params.id) },
        data,
    });
    // Correções feitas no Cadastro Base são propagadas aos vínculos existentes.
    await prisma_1.default.veiculo.updateMany({
        where: { modeloCarretaId: modelo.id },
        data: {
            ...(data.placaVeiculo !== undefined ? { placa: data.placaVeiculo } : {}),
            ...(data.motoristaNome !== undefined ? { motoristaNome: data.motoristaNome } : {}),
            ...(data.motoristaTelefone !== undefined ? { motoristaTelefone: data.motoristaTelefone } : {}),
        },
    });
    return res.json(modelo);
}
// Repara os dados históricos usando Cadastros Base como fonte de verdade.
async function sincronizarVinculos(_req, res) {
    const cadastros = await prisma_1.default.modeloCarreta.findMany({
        select: { id: true, placaVeiculo: true, motoristaNome: true, motoristaTelefone: true },
    });
    const resultados = await Promise.all(cadastros.map((cadastro) => prisma_1.default.veiculo.updateMany({
        where: { modeloCarretaId: cadastro.id },
        data: {
            ...(cadastro.placaVeiculo ? { placa: cadastro.placaVeiculo } : {}),
            ...(cadastro.motoristaNome ? { motoristaNome: cadastro.motoristaNome } : {}),
            ...(cadastro.motoristaTelefone ? { motoristaTelefone: cadastro.motoristaTelefone } : {}),
        },
    })));
    return res.json({ atualizados: resultados.reduce((total, item) => total + item.count, 0) });
}
async function deletar(req, res) {
    const id = parseInt(req.params.id);
    const emUso = await prisma_1.default.veiculo.findFirst({ where: { modeloCarretaId: id } });
    if (emUso)
        throw new errorHandler_1.AppError('Modelo em uso por veículos, não pode ser deletado', 400);
    await prisma_1.default.modeloCarreta.delete({ where: { id } });
    return res.json({ message: 'Modelo removido' });
}
//# sourceMappingURL=modelos.controller.js.map