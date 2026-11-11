import { Response } from 'express';
import { z } from 'zod';
import prisma, { prismaBase } from '../database/prisma';
import { lerParametro } from '../services/parametros';
import { AuthRequest } from '../middleware/auth';
import { Prisma, StatusLiberacao, StatusVeiculo } from '@prisma/client';
import { STATUS_MONITORAMENTO } from '../services/liberacao-status';


export async function getResumo(_req: AuthRequest, res: Response) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em3dias = new Date(hoje);
  em3dias.setDate(em3dias.getDate() + 3);

  // Deadline é de carregamento: liberação com tudo carregado não está "em risco",
  // mesmo com a data passada. `carregado` é o cache do carregado real (veículos ativos
  // a partir de MANIFESTADO). Suspensas ficam fora (status ATIVA).
  const ativasLista = await prisma.liberacao.findMany({
    where: { status: StatusLiberacao.ATIVA },
    select: { deadline: true, totalFardos: true, carregado: true },
  });
  const comSaldo = ativasLista.filter((l) => l.carregado < l.totalFardos);
  const ativas = ativasLista.length;
  const vencidas = comSaldo.filter((l) => l.deadline < hoje).length;
  const em3Dias = comSaldo.filter((l) => l.deadline >= hoje && l.deadline <= em3dias).length;
  const volumePendente = {
    _sum: {
      totalFardos: ativasLista.reduce((s, l) => s + l.totalFardos, 0),
      carregado: ativasLista.reduce((s, l) => s + l.carregado, 0),
    },
  };

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

  // Veículo inativo (excluído) não é monitorado.
  const veiculoWhere: any = { liberacao: liberacaoWhere, ativo: true };
  if (status) {
    veiculoWhere.status = status as StatusVeiculo;
  } else {
    veiculoWhere.status = { in: STATUS_MONITORAMENTO };
  }
  if (placa) veiculoWhere.placa = { contains: placa, mode: 'insensitive' };
  if (motorista) {
    veiculoWhere.OR = [
      { motoristaNome: { contains: motorista, mode: 'insensitive' } },
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

// ─── Painel interativo (Dashboard novo) ─────────────────────────────────────
// Um endpoint só devolve todos os blocos já filtrados, para o painel inteiro
// mudar de uma vez a cada clique. Filtros se somam: cliente, filial, dia do
// deadline, situação do prazo e período (de/até, pelo deadline).

type SituacaoPrazo = 'VENCIDO' | 'CRITICO' | 'ATENCAO' | 'NO_PRAZO';

const DIA_MS = 86400000;
// Datas "só dia" (deadline) ficam à meia-noite UTC: compara pelo próprio dia UTC.
const diaUtc = (d: Date) => d.toISOString().slice(0, 10);
const hojeLocal = () => {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // Brasília
  return agora.toISOString().slice(0, 10);
};
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);

// Deadline é de carregamento: com tudo carregado, está no prazo.
function situacaoPrazo(dias: number, saldoCarregar: number): SituacaoPrazo {
  if (saldoCarregar <= 0) return 'NO_PRAZO';
  if (dias < 0) return 'VENCIDO';
  if (dias <= 1) return 'CRITICO';
  if (dias <= 3) return 'ATENCAO';
  return 'NO_PRAZO';
}

const filtrosPainelSchema = z.object({
  clienteId: z.coerce.number().int().positive().optional(),
  origemId: z.coerce.number().int().positive().optional(),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  situacao: z.enum(['VENCIDO', 'CRITICO', 'ATENCAO', 'NO_PRAZO']).optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function getPainel(req: AuthRequest, res: Response) {
  const f = filtrosPainelSchema.parse(req.query);
  const hoje = hojeLocal();

  const deadline: Prisma.DateTimeFilter = {};
  if (f.de) deadline.gte = new Date(`${f.de}T00:00:00Z`);
  if (f.ate) deadline.lte = new Date(`${f.ate}T00:00:00Z`);
  if (f.dia) Object.assign(deadline, { gte: new Date(`${f.dia}T00:00:00Z`), lte: new Date(`${f.dia}T00:00:00Z`) });

  // Suspensas ficam fora (só ATIVA). Inativos já estão fora do cache `carregado`.
  const liberacoes = await prisma.liberacao.findMany({
    where: {
      status: StatusLiberacao.ATIVA,
      ...(f.clienteId && { clienteId: f.clienteId }),
      ...(f.origemId && { origemId: f.origemId }),
      ...(Object.keys(deadline).length && { deadline }),
    },
    select: {
      id: true, instrucao: true, totalFardos: true, carregado: true, deadline: true,
      clienteId: true, clienteNome: true, cliente: { select: { nome: true } },
      origemId: true, filialNome: true, origem: { select: { nome: true } },
      veiculos: { where: { ativo: true }, select: { qtdFardos: true } },
    },
    orderBy: { deadline: 'asc' },
  });

  const cargasTodas = liberacoes.map((l) => {
    const dias = diasEntre(hoje, diaUtc(l.deadline));
    const saldoCarregar = Math.max(0, l.totalFardos - l.carregado);
    const programado = l.veiculos.reduce((s, v) => s + v.qtdFardos, 0);
    return {
      id: l.id,
      instrucao: l.instrucao,
      clienteId: l.clienteId,
      cliente: l.clienteNome ?? l.cliente?.nome ?? '—',
      origemId: l.origemId,
      filial: l.filialNome ?? l.origem?.nome ?? '—',
      totalFardos: l.totalFardos,
      carregado: l.carregado,
      saldoProgramar: Math.max(0, l.totalFardos - programado),
      saldoCarregar,
      deadline: diaUtc(l.deadline),
      dias,
      situacao: situacaoPrazo(dias, saldoCarregar),
    };
  });
  const cargas = f.situacao ? cargasTodas.filter((c) => c.situacao === f.situacao) : cargasTodas;

  // KPIs
  const total = cargas.reduce((s, c) => s + c.totalFardos, 0);
  const carregado = cargas.reduce((s, c) => s + Math.min(c.carregado, c.totalFardos), 0);
  const kpis = {
    cargasAtivas: cargas.length,
    emRisco: cargas.filter((c) => c.situacao === 'VENCIDO' || c.situacao === 'CRITICO').length,
    vencidas: cargas.filter((c) => c.situacao === 'VENCIDO').length,
    // Falta carregar (regra nova: carregado = a partir de MANIFESTADO).
    fardosPendentes: cargas.reduce((s, c) => s + c.saldoCarregar, 0),
    // Falta programar: fardos ainda sem caminhão.
    fardosAProgramar: cargas.reduce((s, c) => s + c.saldoProgramar, 0),
    taxaCumprimento: total > 0 ? Math.round((carregado / total) * 1000) / 10 : 0,
    meta: await lerParametro('meta_cumprimento'),
  };

  // Retrato diário: grava o do dia só com o painel sem filtro (número "oficial").
  const semFiltro = !f.clienteId && !f.origemId && !f.dia && !f.situacao && !f.de && !f.ate;
  if (semFiltro) {
    const dia = new Date(`${hoje}T00:00:00Z`);
    const valores = { cargasAtivas: kpis.cargasAtivas, emRisco: kpis.emRisco, fardosPendentes: kpis.fardosPendentes, taxaCumprimento: kpis.taxaCumprimento };
    await prismaBase.kpiDiario.upsert({ where: { dia }, update: valores, create: { dia, ...valores } });
  }
  const historico = (await prismaBase.kpiDiario.findMany({ orderBy: { dia: 'desc' }, take: 30 })).reverse()
    .map((k) => ({ dia: diaUtc(k.dia), cargasAtivas: k.cargasAtivas, emRisco: k.emRisco, fardosPendentes: k.fardosPendentes, taxaCumprimento: k.taxaCumprimento }));

  // Agrupamentos (somam o que está no filtro).
  const agrupar = (chave: (c: (typeof cargas)[number]) => { id: number; nome: string }) => {
    const mapa = new Map<number, { id: number; nome: string; cargas: number; fardos: number; total: number }>();
    for (const c of cargas) {
      const k = chave(c);
      const item = mapa.get(k.id) ?? { ...k, cargas: 0, fardos: 0, total: 0 };
      item.cargas += 1;
      item.fardos += c.saldoCarregar;
      item.total += c.totalFardos;
      mapa.set(k.id, item);
    }
    return [...mapa.values()];
  };
  const pendenciasPorCliente = agrupar((c) => ({ id: c.clienteId, nome: c.cliente })).sort((a, b) => b.fardos - a.fardos);
  const volumePorFilial = agrupar((c) => ({ id: c.origemId, nome: c.filial })).sort((a, b) => b.total - a.total);

  // Linha do tempo: vencidas num balde só + próximos 21 dias, por situação.
  const linhaDoTempo: { dia: string; rotulo: string; VENCIDO: number; CRITICO: number; ATENCAO: number; NO_PRAZO: number; cargasVENCIDO: number; cargasCRITICO: number; cargasATENCAO: number; cargasNO_PRAZO: number }[] = [];
  const balde = (dia: string, rotulo: string) => ({ dia, rotulo, VENCIDO: 0, CRITICO: 0, ATENCAO: 0, NO_PRAZO: 0, cargasVENCIDO: 0, cargasCRITICO: 0, cargasATENCAO: 0, cargasNO_PRAZO: 0 });
  linhaDoTempo.push(balde('vencidas', 'Vencidas'));
  for (let i = 0; i <= 21; i++) {
    const d = new Date(Date.parse(`${hoje}T00:00:00Z`) + i * DIA_MS).toISOString().slice(0, 10);
    linhaDoTempo.push(balde(d, `${d.slice(8, 10)}/${d.slice(5, 7)}`));
  }
  const porDia = new Map(linhaDoTempo.map((b) => [b.dia, b]));
  for (const c of cargas) {
    // Data passada mas tudo carregado: não é atraso, fica fora da linha do tempo.
    if (c.dias < 0 && c.situacao !== 'VENCIDO') continue;
    const b = c.dias < 0 ? porDia.get('vencidas') : porDia.get(c.deadline);
    if (!b) continue; // além de 3 semanas
    b[c.situacao] += c.saldoCarregar;
    b[`cargas${c.situacao}` as const] += 1;
  }

  // Atividade ao vivo: últimas alterações (status, SM, agendamento, inativação)
  // nas liberações do filtro, tiradas do histórico.
  const ids = cargas.map((c) => c.id);
  const atividade = ids.length ? await prisma.auditoriaLog.findMany({
    where: {
      liberacaoId: { in: ids },
      OR: [
        { tabelaAfetada: 'Veiculo', acao: 'INSERT' },
        { tabelaAfetada: 'Veiculo', camposAlterados: { contains: 'status' } },
        { tabelaAfetada: 'Veiculo', camposAlterados: { contains: 'dataAgendamento' } },
        { tabelaAfetada: 'Veiculo', camposAlterados: { contains: 'ativo' } },
        { tabelaAfetada: 'Liberacao', camposAlterados: { contains: 'status' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: { id: true, tabelaAfetada: true, registroId: true, acao: true, camposAlterados: true, dadosAntigos: true, dadosNovos: true, descricao: true, liberacaoId: true, createdAt: true, usuario: { select: { nome: true } } },
  }) : [];
  const instrucaoPorId = new Map(cargas.map((c) => [c.id, c.instrucao]));
  const parse = (t: string | null) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

  return res.json({
    hoje,
    kpis,
    historico,
    pendenciasPorCliente,
    volumePorFilial,
    linhaDoTempo,
    atividade: atividade.map((a) => ({
      id: a.id,
      tabela: a.tabelaAfetada,
      veiculoId: a.tabelaAfetada === 'Veiculo' ? a.registroId : null,
      acao: a.acao,
      campos: a.camposAlterados?.split(',') ?? [],
      antes: parse(a.dadosAntigos),
      depois: parse(a.dadosNovos),
      descricao: a.descricao,
      liberacaoId: a.liberacaoId,
      instrucao: a.liberacaoId ? instrucaoPorId.get(a.liberacaoId) ?? null : null,
      usuario: a.usuario?.nome,
      em: a.createdAt,
    })),
    cargas,
  });
}
