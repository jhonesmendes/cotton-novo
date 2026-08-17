import { Response } from 'express';
import prisma from '../database/prisma';
import { AuthRequest } from '../middleware/auth';
import { StatusLiberacao, StatusVeiculo } from '@prisma/client';

const STATUS_MONITORAMENTO: StatusVeiculo[] = [
  StatusVeiculo.LIBERADO,
  StatusVeiculo.AGUARDANDO_NFE,
  StatusVeiculo.AGUARDANDO_GR,
  StatusVeiculo.AGUARDANDO_CARREGAMENTO,
  StatusVeiculo.CARREGADO,
  StatusVeiculo.EM_TRANSITO,
  StatusVeiculo.AGUARDANDO_DESCARGA,
];

export async function listarAlertas(req: AuthRequest, res: Response) {
  const {
    clienteId, origemId, terminalId, motorista,
    diasMax = '7', urgencia, page = '1', limit = '50',
  } = req.query as Record<string, string>;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataMax = new Date(hoje);
  dataMax.setDate(dataMax.getDate() + parseInt(diasMax));

  const liberacaoWhere: any = {
    status: StatusLiberacao.ATIVA,
    deadline: { lte: dataMax },
  };

  if (clienteId) liberacaoWhere.clienteId = parseInt(clienteId);
  if (origemId) liberacaoWhere.origemId = parseInt(origemId);
  if (terminalId) liberacaoWhere.terminalId = parseInt(terminalId);

  const veiculoWhere: any = { liberacao: liberacaoWhere, status: { in: STATUS_MONITORAMENTO } };
  if (motorista) {
    veiculoWhere.OR = [
      { motoristaNome: { contains: motorista } },
      { motoristaTelefone: { contains: motorista } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [total, veiculos] = await Promise.all([
    prisma.veiculo.count({ where: veiculoWhere }),
    prisma.veiculo.findMany({
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
    let nivel: string;
    if (diasParaVencer < 0) nivel = 'VENCIDO';
    else if (diasParaVencer === 0) nivel = 'HOJE';
    else if (diasParaVencer <= 1) nivel = 'CRITICO';
    else if (diasParaVencer <= 3) nivel = 'ALERTA';
    else nivel = 'MONITORAR';

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

export async function historico(req: AuthRequest, res: Response) {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [total, logs] = await Promise.all([
    prisma.alertaLog.count(),
    prisma.alertaLog.findMany({
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

export async function getConfig(_req: AuthRequest, res: Response) {
  const configs = await prisma.alertaConfig.findMany({
    include: {
      cliente: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
    },
  });
  return res.json({ data: configs, total: configs.length });
}

export async function salvarConfig(req: AuthRequest, res: Response) {
  const { id, ...data } = req.body;

  const config = id
    ? await prisma.alertaConfig.update({ where: { id }, data })
    : await prisma.alertaConfig.create({ data });

  return res.json(config);
}
