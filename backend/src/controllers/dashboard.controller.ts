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

export async function getResumo(_req: AuthRequest, res: Response) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em3dias = new Date(hoje);
  em3dias.setDate(em3dias.getDate() + 3);

  const [ativas, vencidas, em3Dias, volumePendente] = await Promise.all([
    prisma.liberacao.count({ where: { status: StatusLiberacao.ATIVA } }),
    prisma.liberacao.count({
      where: { status: StatusLiberacao.ATIVA, deadline: { lt: hoje } },
    }),
    prisma.liberacao.count({
      where: {
        status: StatusLiberacao.ATIVA,
        deadline: { gte: hoje, lte: em3dias },
      },
    }),
    prisma.liberacao.aggregate({
      where: { status: StatusLiberacao.ATIVA },
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

export async function getVeiculosVencendo(req: AuthRequest, res: Response) {
  const {
    clienteId, origemId, terminalId, status,
    diasMax = '30', diasMin, placa, motorista,
    page = '1', limit = '50',
  } = req.query as Record<string, string>;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataMax = new Date(hoje);
  dataMax.setDate(dataMax.getDate() + parseInt(diasMax));

  const liberacaoWhere: any = {
    status: StatusLiberacao.ATIVA,
    deadline: { lte: dataMax },
  };

  if (diasMin) {
    const dataMin = new Date(hoje);
    dataMin.setDate(dataMin.getDate() + parseInt(diasMin));
    liberacaoWhere.deadline.gte = dataMin;
  }
  if (clienteId) liberacaoWhere.clienteId = parseInt(clienteId);
  if (origemId) liberacaoWhere.origemId = parseInt(origemId);
  if (terminalId) liberacaoWhere.terminalId = parseInt(terminalId);

  const veiculoWhere: any = { liberacao: liberacaoWhere };
  if (status) {
    veiculoWhere.status = status as StatusVeiculo;
  } else {
    veiculoWhere.status = { in: STATUS_MONITORAMENTO };
  }
  if (placa) veiculoWhere.placa = { contains: placa };
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

export async function getKPIs(req: AuthRequest, res: Response) {
  const { clienteId, origemId } = req.query as Record<string, string>;

  const where: any = { status: StatusLiberacao.ATIVA };
  if (clienteId) where.clienteId = parseInt(clienteId);
  if (origemId) where.origemId = parseInt(origemId);

  // Por cliente
  const porCliente = await prisma.liberacao.groupBy({
    by: ['clienteId'],
    where,
    _count: { id: true },
    _sum: { totalFardos: true, carregado: true },
  });

  // Por filial
  const porFilial = await prisma.liberacao.groupBy({
    by: ['origemId'],
    where,
    _count: { id: true },
    _sum: { totalFardos: true, carregado: true },
  });

  // Clientes e origens para lookup
  const [clientes, origens, liberacoesDetalhe] = await Promise.all([
    prisma.cliente.findMany({ select: { id: true, nome: true } }),
    prisma.origem.findMany({ select: { id: true, nome: true } }),
    // Instrução + local de coleta de cada liberação — pro tooltip do gráfico
    // "Fardos Pendentes por Cliente" mostrar de onde vem o saldo agregado.
    prisma.liberacao.findMany({
      where,
      select: { clienteId: true, instrucao: true, localColetaNome: true, localColeta: { select: { nome: true } } },
    }),
  ]);

  const mapCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const mapOrigem = Object.fromEntries(origens.map((o) => [o.id, o.nome]));

  const detalhesPorCliente = new Map<number, { instrucao: string; localColeta: string }[]>();
  for (const l of liberacoesDetalhe) {
    const lista = detalhesPorCliente.get(l.clienteId) ?? [];
    lista.push({ instrucao: l.instrucao, localColeta: l.localColetaNome ?? l.localColeta?.nome ?? '—' });
    detalhesPorCliente.set(l.clienteId, lista);
  }

  return res.json({
    porCliente: porCliente.map((g) => ({
      clienteId: g.clienteId,
      nome: mapCliente[g.clienteId] ?? 'Desconhecido',
      total: g._count.id,
      totalFardos: g._sum.totalFardos ?? 0,
      carregado: g._sum.carregado ?? 0,
      saldo: (g._sum.totalFardos ?? 0) - (g._sum.carregado ?? 0),
      detalhes: detalhesPorCliente.get(g.clienteId) ?? [],
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
