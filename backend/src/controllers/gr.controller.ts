import { Response } from 'express';
import { z } from 'zod';
import { Prisma, StatusLiberacao, StatusRastreamento, StatusSM, StatusVeiculo } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { reavaliarStatusLiberacao } from '../services/liberacao-status';

// Tela da Gerenciadora de Risco: todos os veículos ativos das liberações em
// andamento numa lista só, para validar placa e SM. Nunca devolve frete nem margem.

// Usuário GR com filial só enxerga as placas dela; os demais perfis veem tudo.
function filtroFilialGr(req: AuthRequest): Prisma.LiberacaoWhereInput {
  return req.user?.perfil === 'GR' && req.user.filialId ? { origemId: req.user.filialId } : {};
}

const SELECT_GR = {
  id: true, placa: true, status: true, statusSm: true, statusRastreamento: true,
  possuiIsca: true, numeroIsca: true, dataAgendamento: true, qtdFardos: true,
  motoristaNome: true, motoristaCpf: true, motoristaTelefone: true, updatedAt: true,
  modeloCarreta: { select: { nomeDescricao: true } },
  liberacao: {
    select: {
      id: true, instrucao: true, status: true, deadline: true,
      clienteId: true, clienteNome: true, cliente: { select: { nome: true } },
      origemId: true, filialNome: true, origem: { select: { nome: true } },
      origemNome: true, terminal: { select: { nome: true } },
      destinoNome: true, destino: { select: { nome: true } },
      localColetaNome: true, localColeta: { select: { nome: true } },
    },
  },
} as const;

export async function listar(req: AuthRequest, res: Response) {
  const q = z.object({
    busca: z.string().trim().optional(),
    // Padrão: tudo menos ENCERRADA. "TODAS" = sem filtro.
    sm: z.union([z.nativeEnum(StatusSM), z.literal('TODAS')]).optional(),
    clienteId: z.coerce.number().int().positive().optional(),
    origemId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(StatusVeiculo).optional(),
    rastreamento: z.nativeEnum(StatusRastreamento).optional(),
    semIsca: z.enum(['1']).optional(),
  }).parse(req.query);

  const liberacao: Prisma.LiberacaoWhereInput = {
    status: { in: [StatusLiberacao.ATIVA, StatusLiberacao.SUSPENSA] },
    ...filtroFilialGr(req),
    ...(q.clienteId && { clienteId: q.clienteId }),
  };
  if (q.origemId && !(req.user?.perfil === 'GR' && req.user.filialId)) liberacao.origemId = q.origemId;

  const base: Prisma.VeiculoWhereInput = { ativo: true, liberacao };
  const where: Prisma.VeiculoWhereInput = {
    ...base,
    ...(q.sm === undefined ? { statusSm: { not: StatusSM.ENCERRADA } } : q.sm === 'TODAS' ? {} : { statusSm: q.sm }),
    ...(q.status && { status: q.status }),
    ...(q.rastreamento && { statusRastreamento: q.rastreamento }),
    ...(q.semIsca && { OR: [{ possuiIsca: null }, { possuiIsca: false }] }),
  };
  if (q.busca) {
    const contem = { contains: q.busca, mode: 'insensitive' as const };
    where.AND = [{ OR: [{ placa: contem }, { motoristaNome: contem }, { motoristaCpf: { contains: q.busca.replace(/\D/g, '') || q.busca } }, { liberacao: { instrucao: contem } }] }];
  }

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const [veiculos, contagemSm, todosDaBase, alteracoesSmHoje] = await Promise.all([
    prisma.veiculo.findMany({ where, select: SELECT_GR, orderBy: [{ liberacao: { deadline: 'asc' } }, { createdAt: 'asc' }], take: 500 }),
    prisma.veiculo.groupBy({ by: ['statusSm'], where: base, _count: { _all: true } }),
    // Opções dos filtros a partir do que está na tela.
    prisma.veiculo.findMany({ where: base, select: { liberacao: { select: { clienteId: true, clienteNome: true, cliente: { select: { nome: true } }, origemId: true, filialNome: true, origem: { select: { nome: true } } } } } }),
    prisma.auditoriaLog.findMany({
      where: { tabelaAfetada: 'Veiculo', createdAt: { gte: inicioDoDia }, camposAlterados: { contains: 'statusSm' } },
      select: { registroId: true, dadosNovos: true },
    }),
  ]);

  const ultimas = await prisma.auditoriaLog.findMany({
    where: { tabelaAfetada: 'Veiculo', registroId: { in: veiculos.map((v) => v.id) } },
    distinct: ['registroId'],
    orderBy: { createdAt: 'desc' },
    select: { registroId: true, createdAt: true, usuario: { select: { nome: true } } },
  });
  const ultimaPorVeiculo = new Map(ultimas.map((u) => [u.registroId, u]));

  const porSm = Object.fromEntries(contagemSm.map((c) => [c.statusSm, c._count._all]));
  const liberadasHoje = new Set(
    alteracoesSmHoje.filter((a) => { try { return JSON.parse(a.dadosNovos ?? '{}').statusSm === StatusSM.LIBERADA; } catch { return false; } }).map((a) => a.registroId),
  ).size;

  const unicos = <T extends { id: number }>(itens: T[]) => [...new Map(itens.map((i) => [i.id, i])).values()].sort((a, b) => (a as any).nome.localeCompare((b as any).nome));
  const opcoes = {
    clientes: unicos(todosDaBase.map((v) => ({ id: v.liberacao.clienteId, nome: v.liberacao.clienteNome ?? v.liberacao.cliente?.nome ?? '—' }))),
    filiais: unicos(todosDaBase.map((v) => ({ id: v.liberacao.origemId, nome: v.liberacao.filialNome ?? v.liberacao.origem?.nome ?? '—' }))),
  };

  const data = veiculos.map((v) => {
    const l = v.liberacao;
    const ultima = ultimaPorVeiculo.get(v.id);
    return {
      id: v.id,
      placa: v.placa,
      modeloCarreta: v.modeloCarreta?.nomeDescricao ?? null,
      motoristaNome: v.motoristaNome,
      motoristaCpf: v.motoristaCpf,
      motoristaTelefone: v.motoristaTelefone,
      status: v.status,
      statusSm: v.statusSm,
      statusRastreamento: v.statusRastreamento,
      possuiIsca: v.possuiIsca,
      numeroIsca: v.numeroIsca,
      dataAgendamento: v.dataAgendamento,
      qtdFardos: v.qtdFardos,
      liberacaoId: l.id,
      instrucao: l.instrucao,
      liberacaoSuspensa: l.status === StatusLiberacao.SUSPENSA,
      deadline: l.deadline,
      cliente: l.clienteNome ?? l.cliente?.nome,
      filial: l.filialNome ?? l.origem?.nome,
      origem: l.origemNome ?? l.terminal?.nome,
      destino: l.destinoNome ?? l.destino?.nome,
      localColeta: l.localColetaNome ?? l.localColeta?.nome,
      ultimaAlteracao: ultima ? { usuario: ultima.usuario?.nome, em: ultima.createdAt } : null,
    };
  });

  return res.json({
    data,
    total: data.length,
    contadores: {
      pendentes: porSm[StatusSM.PENDENTE] ?? 0,
      abertas: porSm[StatusSM.ABERTA] ?? 0,
      liberadas: porSm[StatusSM.LIBERADA] ?? 0,
      encerradas: porSm[StatusSM.ENCERRADA] ?? 0,
      liberadasHoje,
    },
    opcoes,
    filialFixa: req.user?.perfil === 'GR' && req.user.filialId ? opcoes.filiais.find((f) => f.id === req.user!.filialId)?.nome ?? null : null,
  });
}

// A GR altera só os campos de risco: SM, rastreamento e isca. É o mesmo campo do
// veículo — muda na hora na tela da liberação e entra no histórico com o usuário.
const alterarSchema = z.object({
  statusSm: z.nativeEnum(StatusSM).optional(),
  statusRastreamento: z.nativeEnum(StatusRastreamento).optional(),
  possuiIsca: z.boolean().nullable().optional(),
  numeroIsca: z.string().trim().max(60).nullable().optional(),
}).strict();

export async function alterar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const data = alterarSchema.parse(req.body);
  if (data.possuiIsca === false) data.numeroIsca = null;

  const veiculo = await prisma.veiculo.findFirst({
    where: { id, liberacao: filtroFilialGr(req) },
    select: { id: true, ativo: true, liberacaoId: true },
  });
  if (!veiculo) throw new AppError('Veículo não encontrado', 404);
  if (!veiculo.ativo) throw new AppError('Veículo inativo não pode ser alterado', 400, 'VEICULO_INATIVO');

  await prisma.veiculo.update({ where: { id }, data });
  // SM/rastreamento/isca entram no checklist de fechamento.
  await reavaliarStatusLiberacao(veiculo.liberacaoId);
  return res.json({ ok: true });
}
