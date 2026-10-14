import { Response } from 'express';
import { z } from 'zod';
import { Prisma, StatusLiberacao, StatusVeiculo, TipoFardo } from '@prisma/client';
import prisma from '../database/prisma';
import { AuthRequest } from '../middleware/auth';
import { situacaoFechamento } from '../services/liberacao-status';

// Brasília é UTC-3 fixo (sem horário de verão desde 2019).
const OFFSET_BRT_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

type Agrupamento = 'mes' | 'semana';

// ─── Datas ──────────────────────────────────────────────────────────────────
// Duas naturezas de data no banco:
//  - instantes (concluidaEm, finalizadoEm): convertidos para o dia de Brasília;
//  - "só dia" (dataLiberacao, deadline): gravados à meia-noite UTC — o dia é o
//    próprio dia UTC (converter para Brasília jogaria para o dia anterior).
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const diaDeInstante = (d: Date) => ymd(new Date(d.getTime() - OFFSET_BRT_MS));
const diaDeData = (d: Date) => ymd(d);
const parseDia = (dia: string) => new Date(`${dia}T00:00:00Z`);
const somarDias = (dia: string, n: number) => ymd(new Date(parseDia(dia).getTime() + n * DIA_MS));

function inicioDoPeriodo(dia: string, ag: Agrupamento) {
  if (ag === 'mes') return `${dia.slice(0, 7)}-01`;
  const semana = (parseDia(dia).getUTCDay() + 6) % 7; // segunda = 0
  return somarDias(dia, -semana);
}

function proximoPeriodo(inicio: string, ag: Agrupamento) {
  if (ag === 'semana') return somarDias(inicio, 7);
  const d = parseDia(inicio);
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
}

function voltarPeriodos(inicio: string, n: number, ag: Agrupamento) {
  if (ag === 'semana') return somarDias(inicio, -7 * n);
  const d = parseDia(inicio);
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1)));
}

function rotulo(inicio: string, ag: Agrupamento) {
  const d = parseDia(inicio);
  if (ag === 'mes') return `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
  const fim = parseDia(somarDias(inicio, 6));
  const f = (x: Date) => `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${f(d)} a ${f(fim)}`;
}

// ─── Métricas ───────────────────────────────────────────────────────────────
interface Concluida {
  id: number;
  dataLiberacao: Date;
  deadline: Date;
  concluidaEm: Date | null;
  carregado: number;
  totalFardos: number;
  fechamentoManual: boolean;
  fardosPendentesFechamento: number | null;
  freteEmpresa: number;
  freteMotorista: number | null;
  veiculos: { pesoCarregado: number | null; freteMotorista: number }[];
}

const arred = (v: number, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

// Fretes em R$/t: faturamento = toneladas × frete empresa; custo = Σ (peso da
// viagem × frete motorista da viagem). Margem (regra da operação), em % =
// (frete empresa − frete motorista da liberação) ÷ frete empresa × 100.
export function financeiro(l: Pick<Concluida, 'freteEmpresa' | 'freteMotorista' | 'veiculos'>) {
  const comPeso = l.veiculos.filter((v) => v.pesoCarregado != null);
  const toneladas = comPeso.reduce((s, v) => s + v.pesoCarregado!, 0);
  const faturamento = toneladas * l.freteEmpresa;
  const custoMotorista = comPeso.reduce((s, v) => s + v.pesoCarregado! * v.freteMotorista, 0);
  return {
    toneladas,
    faturamento,
    custoMotorista,
    resultado: faturamento - custoMotorista,
    margem: l.freteMotorista == null || !l.freteEmpresa ? null : ((l.freteEmpresa - l.freteMotorista) / l.freteEmpresa) * 100,
    veiculosSemPeso: l.veiculos.length - comPeso.length,
  };
}

function metricas(concluidas: Concluida[], abertas: number, veiculos: { qtdFardos: number }[]) {
  const noPrazo = concluidas.filter((l) => l.concluidaEm && diaDeInstante(l.concluidaEm) <= diaDeData(l.deadline)).length;
  const dias = concluidas
    .filter((l) => l.concluidaEm)
    .map((l) => (parseDia(diaDeInstante(l.concluidaEm!)).getTime() - parseDia(diaDeData(l.dataLiberacao)).getTime()) / DIA_MS);
  const manuais = concluidas.filter((l) => l.fechamentoManual);
  const fin = concluidas.map(financeiro);
  const margens = fin.map((x) => x.margem).filter((m): m is number => m != null);
  const soma = (k: 'toneladas' | 'faturamento' | 'custoMotorista' | 'resultado' | 'veiculosSemPeso') => fin.reduce((s, x) => s + x[k], 0);
  return {
    abertas,
    concluidas: concluidas.length,
    concluidasManual: manuais.length,
    fardosEntregues: concluidas.reduce((s, l) => s + l.carregado, 0),
    fardosPendentesManual: manuais.reduce((s, l) => s + (l.fardosPendentesFechamento ?? 0), 0),
    noPrazo,
    percentualNoPrazo: concluidas.length ? Math.round((noPrazo / concluidas.length) * 1000) / 10 : null,
    tempoMedioDias: dias.length ? Math.round((dias.reduce((s, x) => s + x, 0) / dias.length) * 10) / 10 : null,
    veiculosFinalizados: veiculos.length,
    fardosVeiculosFinalizados: veiculos.reduce((s, v) => s + v.qtdFardos, 0),
    toneladas: arred(soma('toneladas'), 3),
    faturamento: arred(soma('faturamento')),
    custoMotorista: arred(soma('custoMotorista')),
    resultado: arred(soma('resultado')),
    margemMedia: margens.length ? arred(margens.reduce((s, m) => s + m, 0) / margens.length) : null,
    veiculosSemPeso: soma('veiculosSemPeso'),
  };
}

const filtrosSchema = z.object({
  agrupamento: z.enum(['mes', 'semana']).default('mes'),
  dataInicio: z.string().regex(DATA).optional(),
  dataFim: z.string().regex(DATA).optional(),
  // Vários de uma vez: "1,4,7".
  clienteId: z.string().regex(/^\d+(,\d+)*$/).optional(),
  origemId: z.string().regex(/^\d+(,\d+)*$/).optional(),
  destinoId: z.coerce.number().int().positive().optional(),
  terminalId: z.coerce.number().int().positive().optional(),
  localColetaId: z.coerce.number().int().positive().optional(),
  tipoFardo: z.nativeEnum(TipoFardo).optional(),
  fechamento: z.enum(['auto', 'manual']).optional(),
  // Faixas pelo tamanho da instrução: total de fardos e toneladas carregadas.
  fardosMin: z.coerce.number().int().nonnegative().optional(),
  fardosMax: z.coerce.number().int().nonnegative().optional(),
  toneladasMin: z.coerce.number().nonnegative().optional(),
  toneladasMax: z.coerce.number().nonnegative().optional(),
});

const ids = (lista?: string) => (lista ? lista.split(',').map(Number) : undefined);

export async function getRelatorio(req: AuthRequest, res: Response) {
  const f = filtrosSchema.parse(req.query);
  const ag: Agrupamento = f.agrupamento;
  const hoje = diaDeInstante(new Date());

  // Período alinhado ao agrupamento (mês cheio / semana de segunda a domingo),
  // para os períodos serem comparáveis entre si.
  const padraoInicio = voltarPeriodos(inicioDoPeriodo(hoje, ag), ag === 'mes' ? 5 : 11, ag);
  const inicio = inicioDoPeriodo(f.dataInicio ?? padraoInicio, ag);
  const ultimoPeriodo = inicioDoPeriodo(f.dataFim ?? hoje, ag);
  if (inicio > ultimoPeriodo) {
    return res.status(400).json({ error: { code: 'PERIODO_INVALIDO', message: 'Data inicial maior que a final' } });
  }
  const fimExclusivo = proximoPeriodo(ultimoPeriodo, ag);

  const periodos: string[] = [];
  for (let p = inicio; p < fimExclusivo; p = proximoPeriodo(p, ag)) {
    periodos.push(p);
    if (periodos.length > 120) break; // proteção contra intervalos absurdos
  }
  // Período anterior de mesmo tamanho, para a comparação dos indicadores.
  const inicioAnterior = voltarPeriodos(inicio, periodos.length, ag);

  // Faixa de toneladas: soma do peso dos veículos de cada liberação.
  let idsPorPeso: number[] | undefined;
  if (f.toneladasMin != null || f.toneladasMax != null) {
    const grupos = await prisma.veiculo.groupBy({
      by: ['liberacaoId'],
      _sum: { pesoCarregado: true },
      having: {
        pesoCarregado: {
          _sum: {
            ...(f.toneladasMin != null && { gte: f.toneladasMin }),
            ...(f.toneladasMax != null && { lte: f.toneladasMax }),
          },
        },
      },
    });
    idsPorPeso = grupos.map((g) => g.liberacaoId);
  }

  const dims: Prisma.LiberacaoWhereInput = {
    ...(f.clienteId && { clienteId: { in: ids(f.clienteId) } }),
    ...(f.origemId && { origemId: { in: ids(f.origemId) } }),
    ...((f.fardosMin != null || f.fardosMax != null) && {
      totalFardos: { ...(f.fardosMin != null && { gte: f.fardosMin }), ...(f.fardosMax != null && { lte: f.fardosMax }) },
    }),
    ...(idsPorPeso && { id: { in: idsPorPeso } }),
    ...(f.destinoId && { destinoId: f.destinoId }),
    ...(f.terminalId && { terminalId: f.terminalId }),
    ...(f.localColetaId && { localColetaId: f.localColetaId }),
    ...(f.tipoFardo && { tipoFardo: f.tipoFardo }),
  };
  const fechamento: Prisma.LiberacaoWhereInput =
    f.fechamento === 'manual' ? { fechamentoManual: true } : f.fechamento === 'auto' ? { fechamentoManual: false } : {};

  // Limites: instantes em horário de Brasília; datas "só dia" em UTC.
  const instanteDe = (dia: string) => new Date(`${dia}T00:00:00-03:00`);
  const dataDe = (dia: string) => parseDia(dia);

  const [concluidas, abertas, veiculos, emAndamento] = await Promise.all([
    prisma.liberacao.findMany({
      where: {
        ...dims, ...fechamento,
        status: StatusLiberacao.CONCLUIDA,
        concluidaEm: { gte: instanteDe(inicioAnterior), lt: instanteDe(fimExclusivo) },
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        origem: { select: { id: true, nome: true } },
        destino: { select: { id: true, nome: true } },
        localColeta: { select: { id: true, nome: true } },
        veiculos: { select: { pesoCarregado: true, freteMotorista: true } },
      },
      orderBy: { concluidaEm: 'desc' },
    }),
    prisma.liberacao.findMany({
      where: {
        ...dims,
        status: { not: StatusLiberacao.CANCELADA },
        dataLiberacao: { gte: dataDe(inicioAnterior), lt: dataDe(fimExclusivo) },
      },
      select: { dataLiberacao: true },
    }),
    prisma.veiculo.findMany({
      where: {
        status: StatusVeiculo.FINALIZADO,
        finalizadoEm: { gte: instanteDe(inicioAnterior), lt: instanteDe(fimExclusivo) },
        liberacao: { ...dims, ...fechamento },
      },
      select: { finalizadoEm: true, qtdFardos: true },
    }),
    // O que está rodando agora (foto atual, não depende do período).
    prisma.liberacao.findMany({
      where: { ...dims, status: StatusLiberacao.ATIVA },
      include: {
        cliente: { select: { id: true, nome: true } },
        origem: { select: { id: true, nome: true } },
        veiculos: { select: { status: true, qtdFardos: true, pesoCarregado: true } },
      },
    }),
  ]);

  // ─── Série por período ────────────────────────────────────────────────────
  const periodoDeInstante = (d: Date) => inicioDoPeriodo(diaDeInstante(d), ag);
  const periodoDeData = (d: Date) => inicioDoPeriodo(diaDeData(d), ag);

  const serie = periodos.map((p) => {
    const conc = concluidas.filter((l) => l.concluidaEm && periodoDeInstante(l.concluidaEm) === p);
    const ab = abertas.filter((l) => periodoDeData(l.dataLiberacao) === p).length;
    const vf = veiculos.filter((v) => v.finalizadoEm && periodoDeInstante(v.finalizadoEm) === p);
    return { periodo: p, rotulo: rotulo(p, ag), ...metricas(conc, ab, vf) };
  });

  const noIntervalo = (dia: string, de: string, ate: string) => dia >= de && dia < ate;
  const concAtual = concluidas.filter((l) => noIntervalo(diaDeInstante(l.concluidaEm!), inicio, fimExclusivo));
  const concAnterior = concluidas.filter((l) => noIntervalo(diaDeInstante(l.concluidaEm!), inicioAnterior, inicio));
  const resumo = {
    atual: metricas(
      concAtual,
      abertas.filter((l) => noIntervalo(diaDeData(l.dataLiberacao), inicio, fimExclusivo)).length,
      veiculos.filter((v) => noIntervalo(diaDeInstante(v.finalizadoEm!), inicio, fimExclusivo)),
    ),
    anterior: metricas(
      concAnterior,
      abertas.filter((l) => noIntervalo(diaDeData(l.dataLiberacao), inicioAnterior, inicio)).length,
      veiculos.filter((v) => noIntervalo(diaDeInstante(v.finalizadoEm!), inicioAnterior, inicio)),
    ),
  };

  // ─── Rodando agora ────────────────────────────────────────────────────────
  const situacoes = emAndamento.map((l) => ({ l, ...situacaoFechamento(l, l.veiculos) }));
  const veiculosRodando = emAndamento.flatMap((l) => l.veiculos)
    .filter((v) => v.status !== StatusVeiculo.FINALIZADO && v.status !== StatusVeiculo.CANCELADO);
  const rodando = {
    liberacoes: emAndamento.length,
    fardosTotal: emAndamento.reduce((s, l) => s + l.totalFardos, 0),
    fardosCarregados: emAndamento.reduce((s, l) => s + l.veiculos.reduce((x, v) => x + v.qtdFardos, 0), 0),
    saldo: situacoes.reduce((s, x) => s + Math.max(0, x.saldo), 0),
    aguardandoFechamento: situacoes.filter((x) => x.aguardandoFechamento).length,
    vencidas: emAndamento.filter((l) => diaDeData(l.deadline) < hoje).length,
    veiculosEmAndamento: veiculosRodando.length,
    toneladasCarregadas: arred(emAndamento.flatMap((l) => l.veiculos).reduce((s, v) => s + (v.pesoCarregado ?? 0), 0), 3),
  };

  // ─── Fechado x Rodando por cliente e por filial ───────────────────────────
  function agrupar(chave: (l: any) => { id: number; nome: string }) {
    const mapa = new Map<number, any>();
    const item = (k: { id: number; nome: string }) => {
      if (!mapa.has(k.id)) {
        mapa.set(k.id, { id: k.id, nome: k.nome, concluidas: 0, fardosEntregues: 0, concluidasManual: 0, toneladas: 0, faturamento: 0, resultado: 0, ativas: 0, fardosTotalAtivas: 0, saldo: 0 });
      }
      return mapa.get(k.id);
    };
    for (const l of concAtual) {
      const i = item(chave(l));
      i.concluidas += 1;
      i.fardosEntregues += l.carregado;
      if (l.fechamentoManual) i.concluidasManual += 1;
      const fin = financeiro(l);
      i.toneladas = arred(i.toneladas + fin.toneladas, 3);
      i.faturamento = arred(i.faturamento + fin.faturamento);
      i.resultado = arred(i.resultado + fin.resultado);
    }
    for (const { l, saldo } of situacoes) {
      const i = item(chave(l));
      i.ativas += 1;
      i.fardosTotalAtivas += l.totalFardos;
      i.saldo += Math.max(0, saldo);
    }
    return [...mapa.values()].sort((a, b) => b.fardosEntregues + b.saldo - (a.fardosEntregues + a.saldo));
  }

  const porCliente = agrupar((l) => ({ id: l.clienteId, nome: l.clienteNome ?? l.cliente?.nome ?? '—' }));
  const porFilial = agrupar((l) => ({ id: l.origemId, nome: l.filialNome ?? l.origem?.nome ?? '—' }));

  const lista = concAtual.map((l) => ({
    ...(() => {
      const fin = financeiro(l);
      return {
        toneladas: arred(fin.toneladas, 3),
        faturamento: arred(fin.faturamento),
        custoMotorista: arred(fin.custoMotorista),
        resultado: arred(fin.resultado),
        margem: fin.margem == null ? null : arred(fin.margem),
        veiculosSemPeso: fin.veiculosSemPeso,
        freteEmpresa: l.freteEmpresa,
        freteMotorista: l.freteMotorista,
      };
    })(),
    id: l.id,
    instrucao: l.instrucao,
    cliente: l.clienteNome ?? l.cliente?.nome,
    filial: l.filialNome ?? l.origem?.nome,
    destino: l.destinoNome ?? l.destino?.nome,
    localColeta: l.localColetaNome ?? l.localColeta?.nome,
    tipoFardo: l.tipoFardo,
    dataLiberacao: l.dataLiberacao,
    deadline: l.deadline,
    concluidaEm: l.concluidaEm,
    noPrazo: diaDeInstante(l.concluidaEm!) <= diaDeData(l.deadline),
    diasAteConcluir: (parseDia(diaDeInstante(l.concluidaEm!)).getTime() - parseDia(diaDeData(l.dataLiberacao)).getTime()) / DIA_MS,
    totalFardos: l.totalFardos,
    carregado: l.carregado,
    veiculos: l.veiculos.length,
    fechamentoManual: l.fechamentoManual,
    fardosPendentesFechamento: l.fardosPendentesFechamento,
    motivoFechamento: l.motivoFechamento,
    fechamentoManualPor: l.fechamentoManualPor,
  }));

  return res.json({
    agrupamento: ag,
    periodo: { inicio, fim: somarDias(fimExclusivo, -1) },
    periodoAnterior: { inicio: inicioAnterior, fim: somarDias(inicio, -1) },
    resumo,
    rodando,
    serie,
    porCliente,
    porFilial,
    lista,
  });
}

// Opções dos filtros (cadastros reais, com id).
export async function getFiltros(_req: AuthRequest, res: Response) {
  const sel = { select: { id: true, nome: true }, orderBy: { nome: 'asc' as const } };
  const [clientes, filiais, destinos, origens, locaisColeta] = await Promise.all([
    prisma.cliente.findMany(sel),
    prisma.origem.findMany(sel),
    prisma.destino.findMany(sel),
    prisma.terminal.findMany(sel),
    prisma.localColeta.findMany(sel),
  ]);
  return res.json({ clientes, filiais, destinos, origens, locaisColeta });
}
