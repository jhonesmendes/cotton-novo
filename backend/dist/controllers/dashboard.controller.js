"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResumo = getResumo;
exports.getVeiculosVencendo = getVeiculosVencendo;
exports.getKPIs = getKPIs;
const prisma_1 = __importDefault(require("../database/prisma"));
const client_1 = require("@prisma/client");
const STATUS_MONITORAMENTO = [
    client_1.StatusVeiculo.LIBERADO,
    client_1.StatusVeiculo.AGUARDANDO_NFE,
    client_1.StatusVeiculo.AGUARDANDO_GR,
    client_1.StatusVeiculo.AGUARDANDO_CARREGAMENTO,
    client_1.StatusVeiculo.CARREGADO,
    client_1.StatusVeiculo.EM_TRANSITO,
    client_1.StatusVeiculo.AGUARDANDO_DESCARGA,
];
async function getResumo(_req, res) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em3dias = new Date(hoje);
    em3dias.setDate(em3dias.getDate() + 3);
    const [ativas, vencidas, em3Dias, volumePendente] = await Promise.all([
        prisma_1.default.liberacao.count({ where: { status: client_1.StatusLiberacao.ATIVA } }),
        prisma_1.default.liberacao.count({
            where: { status: client_1.StatusLiberacao.ATIVA, deadline: { lt: hoje } },
        }),
        prisma_1.default.liberacao.count({
            where: {
                status: client_1.StatusLiberacao.ATIVA,
                deadline: { gte: hoje, lte: em3dias },
            },
        }),
        prisma_1.default.liberacao.aggregate({
            where: { status: client_1.StatusLiberacao.ATIVA },
            _sum: { totalFardos: true, carregado: true },
        }),
    ]);
    const total = volumePendente._sum.totalFardos ?? 0;
    const carregado = volumePendente._sum.carregado ?? 0;
    return res.json({
        cargasAtivas: ativas,
        vencidas,
        em3Dias,
        emRisco: vencidas + em3Dias,
        volumeTotal: total,
        volumeCarregado: carregado,
        volumePendente: total - carregado,
        taxaCumprimento: total > 0 ? Math.round((carregado / total) * 100) : 0,
    });
}
async function getVeiculosVencendo(req, res) {
    const { clienteId, origemId, terminalId, status, diasMax = '30', diasMin, placa, motorista, page = '1', limit = '50', } = req.query;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataMax = new Date(hoje);
    dataMax.setDate(dataMax.getDate() + parseInt(diasMax));
    const liberacaoWhere = {
        status: client_1.StatusLiberacao.ATIVA,
        deadline: { lte: dataMax },
    };
    if (diasMin) {
        const dataMin = new Date(hoje);
        dataMin.setDate(dataMin.getDate() + parseInt(diasMin));
        liberacaoWhere.deadline.gte = dataMin;
    }
    if (clienteId)
        liberacaoWhere.clienteId = parseInt(clienteId);
    if (origemId)
        liberacaoWhere.origemId = parseInt(origemId);
    if (terminalId)
        liberacaoWhere.terminalId = parseInt(terminalId);
    const veiculoWhere = { liberacao: liberacaoWhere };
    if (status) {
        veiculoWhere.status = status;
    }
    else {
        veiculoWhere.status = { in: STATUS_MONITORAMENTO };
    }
    if (placa)
        veiculoWhere.placa = { contains: placa };
    if (motorista) {
        veiculoWhere.OR = [
            { motoristaNome: { contains: motorista } },
            { motoristaTelefone: { contains: motorista } },
        ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [total, veiculos] = await Promise.all([
        prisma_1.default.veiculo.count({ where: veiculoWhere }),
        prisma_1.default.veiculo.findMany({
            where: veiculoWhere,
            skip,
            take,
            include: {
                liberacao: {
                    include: {
                        cliente: { select: { id: true, nome: true } },
                        origem: { select: { id: true, nome: true } },
                        terminal: { select: { id: true, nome: true } },
                    },
                },
                modeloCarreta: { select: { id: true, nomeDescricao: true, capacidadeMaximaFardos: true } },
            },
            orderBy: { liberacao: { deadline: 'asc' } },
        }),
    ]);
    const data = veiculos.map((v) => {
        const deadlineMs = new Date(v.liberacao.deadline).setHours(0, 0, 0, 0);
        const diasParaVencer = Math.ceil((deadlineMs - hoje.getTime()) / 86400000);
        return {
            ...v,
            diasParaVencer,
            urgencia: diasParaVencer < 0 ? 'VENCIDO' : diasParaVencer === 0 ? 'HOJE' :
                diasParaVencer <= 1 ? 'CRITICO' : diasParaVencer <= 3 ? 'ALERTA' :
                    diasParaVencer <= 7 ? 'MONITORAR' : 'OK',
        };
    });
    return res.json({ data, total, page: parseInt(page), limit: take });
}
async function getKPIs(req, res) {
    const { clienteId, origemId } = req.query;
    const where = { status: client_1.StatusLiberacao.ATIVA };
    if (clienteId)
        where.clienteId = parseInt(clienteId);
    if (origemId)
        where.origemId = parseInt(origemId);
    // Por cliente
    const porCliente = await prisma_1.default.liberacao.groupBy({
        by: ['clienteId'],
        where,
        _count: { id: true },
        _sum: { totalFardos: true, carregado: true },
    });
    // Por filial
    const porFilial = await prisma_1.default.liberacao.groupBy({
        by: ['origemId'],
        where,
        _count: { id: true },
        _sum: { totalFardos: true, carregado: true },
    });
    // Clientes e origens para lookup
    const [clientes, origens] = await Promise.all([
        prisma_1.default.cliente.findMany({ select: { id: true, nome: true } }),
        prisma_1.default.origem.findMany({ select: { id: true, nome: true } }),
    ]);
    const mapCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
    const mapOrigem = Object.fromEntries(origens.map((o) => [o.id, o.nome]));
    return res.json({
        porCliente: porCliente.map((g) => ({
            clienteId: g.clienteId,
            nome: mapCliente[g.clienteId] ?? 'Desconhecido',
            total: g._count.id,
            totalFardos: g._sum.totalFardos ?? 0,
            carregado: g._sum.carregado ?? 0,
            saldo: (g._sum.totalFardos ?? 0) - (g._sum.carregado ?? 0),
        })),
        porFilial: porFilial.map((g) => ({
            origemId: g.origemId,
            nome: mapOrigem[g.origemId] ?? 'Desconhecido',
            total: g._count.id,
            totalFardos: g._sum.totalFardos ?? 0,
            carregado: g._sum.carregado ?? 0,
            saldo: (g._sum.totalFardos ?? 0) - (g._sum.carregado ?? 0),
        })),
    });
}
//# sourceMappingURL=dashboard.controller.js.map