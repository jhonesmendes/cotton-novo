"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarAlertas = listarAlertas;
exports.historico = historico;
exports.getConfig = getConfig;
exports.salvarConfig = salvarConfig;
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
async function listarAlertas(req, res) {
    const { clienteId, origemId, terminalId, motorista, diasMax = '7', urgencia, page = '1', limit = '50', } = req.query;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataMax = new Date(hoje);
    dataMax.setDate(dataMax.getDate() + parseInt(diasMax));
    const liberacaoWhere = {
        status: client_1.StatusLiberacao.ATIVA,
        deadline: { lte: dataMax },
    };
    if (clienteId)
        liberacaoWhere.clienteId = parseInt(clienteId);
    if (origemId)
        liberacaoWhere.origemId = parseInt(origemId);
    if (terminalId)
        liberacaoWhere.terminalId = parseInt(terminalId);
    const veiculoWhere = { liberacao: liberacaoWhere, status: { in: STATUS_MONITORAMENTO } };
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
                modeloCarreta: { select: { nomeDescricao: true } },
            },
            orderBy: { liberacao: { deadline: 'asc' } },
        }),
    ]);
    const data = veiculos.map((v) => {
        const deadlineMs = new Date(v.liberacao.deadline).setHours(0, 0, 0, 0);
        const diasParaVencer = Math.ceil((deadlineMs - hoje.getTime()) / 86400000);
        let nivel;
        if (diasParaVencer < 0)
            nivel = 'VENCIDO';
        else if (diasParaVencer === 0)
            nivel = 'HOJE';
        else if (diasParaVencer <= 1)
            nivel = 'CRITICO';
        else if (diasParaVencer <= 3)
            nivel = 'ALERTA';
        else
            nivel = 'MONITORAR';
        return {
            id: v.id,
            placa: v.placa,
            instrucao: v.liberacao.instrucao,
            cliente: v.liberacao.cliente.nome,
            filial: v.liberacao.origem.nome,
            terminal: v.liberacao.terminal.nome,
            motoristaNome: v.motoristaNome,
            motoristaTelefone: v.motoristaTelefone,
            modeloCarreta: v.modeloCarreta.nomeDescricao,
            deadline: v.liberacao.deadline,
            diasParaVencer,
            nivel,
            statusVeiculo: v.status,
            fardosPendentes: v.liberacao.totalFardos - v.liberacao.carregado,
            liberacaoId: v.liberacaoId,
        };
    }).filter((v) => !urgencia || v.nivel === urgencia);
    const sumario = {
        vencidos: data.filter((v) => v.nivel === 'VENCIDO').length,
        hoje: data.filter((v) => v.nivel === 'HOJE').length,
        criticos: data.filter((v) => v.nivel === 'CRITICO').length,
        alerta: data.filter((v) => v.nivel === 'ALERTA').length,
        monitorar: data.filter((v) => v.nivel === 'MONITORAR').length,
    };
    return res.json({ data, total, page: parseInt(page), limit: take, sumario });
}
async function historico(req, res) {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [total, logs] = await Promise.all([
        prisma_1.default.alertaLog.count(),
        prisma_1.default.alertaLog.findMany({
            skip,
            take,
            include: {
                liberacao: { select: { instrucao: true } },
            },
            orderBy: { enviadoEm: 'desc' },
        }),
    ]);
    return res.json({ data: logs, total });
}
async function getConfig(_req, res) {
    const configs = await prisma_1.default.alertaConfig.findMany({
        include: {
            cliente: { select: { id: true, nome: true } },
            terminal: { select: { id: true, nome: true } },
        },
    });
    return res.json({ data: configs, total: configs.length });
}
async function salvarConfig(req, res) {
    const { id, ...data } = req.body;
    const config = id
        ? await prisma_1.default.alertaConfig.update({ where: { id }, data })
        : await prisma_1.default.alertaConfig.create({ data });
    return res.json(config);
}
//# sourceMappingURL=alertas.controller.js.map