import { Response } from 'express';
import { z } from 'zod';
import { AcaoAuditoria, Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import { AuthRequest } from '../middleware/auth';

const usuarioSelect = { id: true, nome: true, email: true, perfil: true } as const;

function parseJson(valor: string | null) {
  if (!valor) return null;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function formatar<T extends { dadosAntigos: string | null; dadosNovos: string | null; camposAlterados: string | null }>(item: T) {
  return {
    ...item,
    dadosAntigos: parseJson(item.dadosAntigos),
    dadosNovos: parseJson(item.dadosNovos),
    camposAlterados: item.camposAlterados ? item.camposAlterados.split(',') : [],
  };
}

const filtrosSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  usuarioId: z.coerce.number().int().positive().optional(),
  tabela: z.string().optional(),
  acao: z.nativeEnum(AcaoAuditoria).optional(),
  liberacaoId: z.coerce.number().int().positive().optional(),
  registroId: z.coerce.number().int().positive().optional(),
  campo: z.string().optional(),
  busca: z.string().optional(),
  // Datas no formato YYYY-MM-DD, interpretadas no fuso de Brasília.
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Tela de auditoria completa (somente ADMIN).
export async function listar(req: AuthRequest, res: Response) {
  const f = filtrosSchema.parse(req.query);

  const where: Prisma.AuditoriaLogWhereInput = {};
  if (f.usuarioId) where.usuarioId = f.usuarioId;
  if (f.tabela) where.tabelaAfetada = f.tabela;
  if (f.acao) where.acao = f.acao;
  if (f.liberacaoId) where.liberacaoId = f.liberacaoId;
  if (f.registroId) where.registroId = f.registroId;
  if (f.campo) where.camposAlterados = { contains: f.campo };
  if (f.dataInicio || f.dataFim) {
    where.createdAt = {
      ...(f.dataInicio ? { gte: new Date(`${f.dataInicio}T00:00:00-03:00`) } : {}),
      ...(f.dataFim ? { lte: new Date(`${f.dataFim}T23:59:59.999-03:00`) } : {}),
    };
  }
  if (f.busca?.trim()) {
    const busca = f.busca.trim();
    where.OR = [
      { descricao: { contains: busca, mode: 'insensitive' } },
      { dadosAntigos: { contains: busca, mode: 'insensitive' } },
      { dadosNovos: { contains: busca, mode: 'insensitive' } },
      { usuario: { nome: { contains: busca, mode: 'insensitive' } } },
    ];
  }

  const [total, itens] = await Promise.all([
    prisma.auditoriaLog.count({ where }),
    prisma.auditoriaLog.findMany({
      where,
      include: { usuario: { select: usuarioSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    }),
  ]);

  // Instrução da liberação, para o link/contexto na tabela.
  const liberacaoIds = [...new Set(itens.map((i) => i.liberacaoId).filter((id): id is number => id != null))];
  const liberacoes = liberacaoIds.length
    ? await prisma.liberacao.findMany({ where: { id: { in: liberacaoIds } }, select: { id: true, instrucao: true } })
    : [];
  const instrucaoPorId = new Map(liberacoes.map((l) => [l.id, l.instrucao]));

  return res.json({
    data: itens.map((i) => ({ ...formatar(i), liberacaoInstrucao: i.liberacaoId ? instrucaoPorId.get(i.liberacaoId) ?? null : null })),
    total,
    page: f.page,
    limit: f.limit,
  });
}

// Opções dos filtros da tela de auditoria.
export async function filtros(_req: AuthRequest, res: Response) {
  const [usuarios, tabelas] = await Promise.all([
    prisma.usuario.findMany({ select: { id: true, nome: true, ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.auditoriaLog.findMany({ distinct: ['tabelaAfetada'], select: { tabelaAfetada: true }, orderBy: { tabelaAfetada: 'asc' } }),
  ]);
  return res.json({ usuarios, tabelas: tabelas.map((t) => t.tabelaAfetada) });
}

// Histórico de uma liberação (dela própria e dos veículos) — mostrado na tela da carga.
export async function historicoLiberacao(req: AuthRequest, res: Response) {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const itens = await prisma.auditoriaLog.findMany({
    where: { liberacaoId: id },
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return res.json(itens.map(formatar));
}
