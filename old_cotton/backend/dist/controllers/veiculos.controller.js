"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.buscarPorId = buscarPorId;
exports.buscarPorPlaca = buscarPorPlaca;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const client_1 = require("@prisma/client");
const criarSchema = zod_1.z.object({
    liberacaoId: zod_1.z.number().int().positive(),
    placa: zod_1.z.string().min(5).max(10),
    modeloCarretaId: zod_1.z.number().int().positive(),
    freteMotorista: zod_1.z.number().positive(),
    qtdFardos: zod_1.z.number().int().positive(),
    motoristaNome: zod_1.z.string().min(3),
    motoristaTelefone: zod_1.z.string().min(10),
    motoristaCpf: zod_1.z.string().length(11).optional(),
    motoristaEmail: zod_1.z.string().email().optional(),
    transportadoraId: zod_1.z.number().int().positive().optional(),
    status: zod_1.z.nativeEnum(client_1.StatusVeiculo).optional().default(client_1.StatusVeiculo.AGENDADO),
    dataAgendamento: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    dataCarregamento: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    dataDescarga: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    observacao: zod_1.z.string().optional(),
});
async function listar(req, res) {
    const { liberacaoId, status, placa, motorista, page = '1', limit = '100' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (liberacaoId)
        where.liberacaoId = parseInt(liberacaoId);
    if (status)
        where.status = status;
    if (placa)
        where.placa = { contains: placa };
    if (motorista) {
        where.OR = [
            { motoristaNome: { contains: motorista } },
            { motoristaTelefone: { contains: motorista } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.veiculo.count({ where }),
        prisma_1.default.veiculo.findMany({
            where,
            skip,
            take,
            include: {
                liberacao: {
                    select: {
                        id: true,
                        instrucao: true,
                        deadline: true,
                        totalFardos: true,
                        carregado: true,
                        cliente: { select: { id: true, nome: true } },
                        origem: { select: { id: true, nome: true } },
                        terminal: { select: { id: true, nome: true } },
                    },
                },
                modeloCarreta: true,
                transportadora: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function buscarPorId(req, res) {
    const { id } = req.params;
    const veiculo = await prisma_1.default.veiculo.findUnique({
        where: { id: parseInt(id) },
        include: {
            liberacao: {
                include: {
                    cliente: true,
                    origem: true,
                    terminal: true,
                },
            },
            modeloCarreta: true,
            transportadora: true,
        },
    });
    if (!veiculo)
        throw new errorHandler_1.AppError('Veículo não encontrado', 404);
    return res.json(veiculo);
}
async function buscarPorPlaca(req, res) {
    const { placa } = req.params;
    const veiculo = await prisma_1.default.veiculo.findFirst({
        where: { placa },
        orderBy: { createdAt: 'desc' },
    });
    if (!veiculo)
        return res.json(null); // Retorna null se não encontrar, sem erro 404 para não poluir o console
    return res.json({
        modeloCarretaId: veiculo.modeloCarretaId,
        motoristaNome: veiculo.motoristaNome,
        motoristaTelefone: veiculo.motoristaTelefone,
        motoristaCpf: veiculo.motoristaCpf,
    });
}
async function criar(req, res) {
    const data = criarSchema.parse(req.body);
    const liberacao = await prisma_1.default.liberacao.findUnique({ where: { id: data.liberacaoId } });
    if (!liberacao)
        throw new errorHandler_1.AppError('Liberação não encontrada', 404);
    const veiculo = await prisma_1.default.veiculo.create({
        data: {
            ...data,
            motoristaCpf: data.motoristaCpf ?? null,
            dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : null,
            dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : null,
            dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : null,
        },
        include: { modeloCarreta: true },
    });
    // Atualiza total carregado na liberação
    await recalcularCarregado(data.liberacaoId);
    return res.status(201).json(veiculo);
}
async function atualizar(req, res) {
    const { id } = req.params;
    const data = criarSchema.partial().parse(req.body);
    const veiculo = await prisma_1.default.veiculo.update({
        where: { id: parseInt(id) },
        data: {
            ...data,
            dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : undefined,
            dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : undefined,
            dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : undefined,
        },
        include: { modeloCarreta: true },
    });
    await recalcularCarregado(veiculo.liberacaoId);
    return res.json(veiculo);
}
async function deletar(req, res) {
    const { id } = req.params;
    const veiculo = await prisma_1.default.veiculo.findUnique({ where: { id: parseInt(id) } });
    if (!veiculo)
        throw new errorHandler_1.AppError('Veículo não encontrado', 404);
    await prisma_1.default.veiculo.delete({ where: { id: parseInt(id) } });
    await recalcularCarregado(veiculo.liberacaoId);
    return res.json({ message: 'Veículo removido' });
}
async function recalcularCarregado(liberacaoId) {
    const soma = await prisma_1.default.veiculo.aggregate({
        where: { liberacaoId },
        _sum: { qtdFardos: true },
    });
    const carregado = soma._sum.qtdFardos ?? 0;
    await prisma_1.default.liberacao.update({
        where: { id: liberacaoId },
        data: { carregado },
    });
    await atualizarStatusLiberacao(liberacaoId);
}
async function atualizarStatusLiberacao(liberacaoId) {
    const liberacao = await prisma_1.default.liberacao.findUnique({
        where: { id: liberacaoId },
        select: { status: true },
    });
    if (!liberacao)
        return;
    const totalVeiculos = await prisma_1.default.veiculo.count({ where: { liberacaoId } });
    const finalizados = await prisma_1.default.veiculo.count({
        where: { liberacaoId, status: client_1.StatusVeiculo.FINALIZADO },
    });
    if (liberacao.status === client_1.StatusLiberacao.CANCELADA) {
        return;
    }
    if (totalVeiculos > 0 && finalizados === totalVeiculos) {
        if (liberacao.status !== client_1.StatusLiberacao.CONCLUIDA) {
            await prisma_1.default.liberacao.update({
                where: { id: liberacaoId },
                data: { status: client_1.StatusLiberacao.CONCLUIDA },
            });
        }
        return;
    }
    if (liberacao.status === client_1.StatusLiberacao.CONCLUIDA) {
        await prisma_1.default.liberacao.update({
            where: { id: liberacaoId },
            data: { status: client_1.StatusLiberacao.ATIVA },
        });
    }
}
//# sourceMappingURL=veiculos.controller.js.map