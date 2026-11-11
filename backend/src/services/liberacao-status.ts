import { StatusLiberacao, StatusRastreamento, StatusSM, StatusVeiculo } from '@prisma/client';
import prisma from '../database/prisma';
import { lerParametro } from './parametros';

// Timeline do veículo, em ordem.
export const ORDEM_STATUS_VEICULO: StatusVeiculo[] = [
  StatusVeiculo.AGUARDANDO_GR,
  StatusVeiculo.TRANSITO_CARREGAMENTO,
  StatusVeiculo.LOCAL,
  StatusVeiculo.MANIFESTADO,
  StatusVeiculo.FALTA_AGENDAR,
  StatusVeiculo.AGENDADO,
  StatusVeiculo.AGUARDANDO_DESCARGA,
  StatusVeiculo.FINALIZADO,
];

// A partir de MANIFESTADO a carga já saiu: conta como "carregado". Antes disso
// (AGUARDANDO_GR, TRANSITO_CARREGAMENTO, LOCAL) o veículo é só "programado".
export const STATUS_CARREGADO: StatusVeiculo[] = ORDEM_STATUS_VEICULO.slice(ORDEM_STATUS_VEICULO.indexOf(StatusVeiculo.MANIFESTADO));

// O deadline da instrução é de carregamento: só cobra prazo de veículo que
// ainda não carregou (antes de MANIFESTADO). Usado nos alertas e no Dashboard.
export const STATUS_MONITORAMENTO: StatusVeiculo[] = ORDEM_STATUS_VEICULO.filter((s) => !STATUS_CARREGADO.includes(s));

export const estaCarregado = (status: StatusVeiculo) => STATUS_CARREGADO.includes(status);

// Campos do veículo usados no resumo e no checklist de fechamento — use este
// select em toda consulta que for chamar `situacaoFechamento`.
export const SELECT_VEICULO_FECHAMENTO = {
  id: true,
  placa: true,
  status: true,
  ativo: true,
  qtdFardos: true,
  pesoCarregado: true,
  dataAgendamento: true,
  statusSm: true,
  statusRastreamento: true,
  possuiIsca: true,
  numeroIsca: true,
  motoristaCpf: true,
  formaPagamento: true,
  freteMotorista: true,
} as const;

export interface VeiculoFechamento {
  id: number;
  placa: string;
  status: StatusVeiculo;
  ativo: boolean;
  qtdFardos: number;
  pesoCarregado: number | null;
  dataAgendamento: Date | null;
  statusSm: StatusSM;
  statusRastreamento: StatusRastreamento;
  possuiIsca: boolean | null;
  numeroIsca: string | null;
  motoristaCpf: string | null;
  formaPagamento: string | null;
  freteMotorista: number;
}

interface LiberacaoFechamento {
  status: StatusLiberacao;
  totalFardos: number;
  pesoTotal: number | null;
}

export type Situacao =
  | 'FALTA_PROGRAMAR'
  | 'FALTA_CARREGAR'
  | 'EM_FINALIZACAO'
  | 'PENDENCIA_DADOS'
  | 'CONCLUIDA'
  | 'SUSPENSA'
  | 'CANCELADA';

export const PARAM_TOLERANCIA_PESO = 'tolerancia_peso_fechamento';

export async function toleranciaPesoFechamento() {
  return lerParametro(PARAM_TOLERANCIA_PESO, 1);
}

const toneladas = (t: number) => `${t.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} t`;

// Programado / carregado / saldos — sempre calculados pelos veículos ativos.
export function resumoCarga(liberacao: Pick<LiberacaoFechamento, 'totalFardos' | 'pesoTotal'>, veiculos: Pick<VeiculoFechamento, 'ativo' | 'status' | 'qtdFardos' | 'pesoCarregado'>[]) {
  const ativos = veiculos.filter((v) => v.ativo);
  const programado = ativos.reduce((s, v) => s + v.qtdFardos, 0);
  const carregados = ativos.filter((v) => estaCarregado(v.status));
  const carregado = carregados.reduce((s, v) => s + v.qtdFardos, 0);
  const pesados = ativos.filter((v) => v.pesoCarregado != null && v.qtdFardos > 0);
  const toneladasCarregadas = pesados.reduce((s, v) => s + v.pesoCarregado!, 0);
  const fardosPesados = pesados.reduce((s, v) => s + v.qtdFardos, 0);
  return {
    programado,
    carregado,
    saldoProgramar: liberacao.totalFardos - programado,
    saldoCarregar: liberacao.totalFardos - carregado,
    toneladasCarregadas,
    // Peso médio do fardo em kg: o da instrução e o real dos veículos já pesados.
    pesoMedioFardoKg: liberacao.pesoTotal && liberacao.totalFardos > 0 ? (liberacao.pesoTotal * 1000) / liberacao.totalFardos : null,
    pesoMedioRealKg: fardosPesados > 0 ? (toneladasCarregadas * 1000) / fardosPesados : null,
  };
}

// O que falta num veículo para a instrução poder fechar.
export function pendenciasVeiculo(v: VeiculoFechamento): string[] {
  const p: string[] = [];
  if (v.pesoCarregado == null) p.push('sem peso');
  if (!v.dataAgendamento) p.push('sem agendamento');
  if (v.statusSm !== StatusSM.ENCERRADA) p.push('SM não encerrada');
  if (v.statusRastreamento === StatusRastreamento.PENDENTE) p.push('rastreamento pendente');
  if (v.possuiIsca == null) p.push('isca não respondida');
  else if (v.possuiIsca && !v.numeroIsca?.trim()) p.push('isca sem número');
  if (!v.motoristaCpf?.replace(/\D/g, '')) p.push('sem CPF do motorista');
  if (!v.formaPagamento?.trim()) p.push('sem forma de pagamento');
  if (!(v.freteMotorista > 0)) p.push('sem frete motorista');
  return p;
}

// Checklist de fechamento (vale só para instruções ATIVAS — as já concluídas
// não passam pelas regras novas).
export function checklistFechamento(liberacao: LiberacaoFechamento, veiculos: VeiculoFechamento[], toleranciaPct: number) {
  const ativos = veiculos.filter((v) => v.ativo);
  const resumo = resumoCarga(liberacao, ativos);
  const instrucao: string[] = [];
  if (resumo.saldoProgramar > 0) instrucao.push(`Saldo de ${resumo.saldoProgramar} fardos sem veículo`);
  if (!liberacao.pesoTotal) {
    instrucao.push('Peso da instrução não informado');
  } else if (ativos.length && ativos.every((v) => v.pesoCarregado != null)) {
    const soma = ativos.reduce((s, v) => s + v.pesoCarregado!, 0);
    const diferenca = Math.abs(soma - liberacao.pesoTotal);
    if (diferenca > (liberacao.pesoTotal * toleranciaPct) / 100 + 1e-9) {
      instrucao.push(`Soma dos pesos dos veículos (${toneladas(soma)}) difere do peso da instrução (${toneladas(liberacao.pesoTotal)}) acima da tolerância de ${toleranciaPct.toLocaleString('pt-BR')}%`);
    }
  }
  const porVeiculo = ativos
    .map((v) => ({ id: v.id, placa: v.placa, pendencias: pendenciasVeiculo(v) }))
    .filter((v) => v.pendencias.length > 0);
  return {
    instrucao,
    veiculos: porVeiculo,
    // Lista corrida para mostrar/gravar: "Peso da instrução não informado", "RYL6D13: sem peso, SM não encerrada"...
    todas: [...instrucao, ...porVeiculo.map((v) => `${v.placa}: ${v.pendencias.join(', ')}`)],
  };
}

// Situação calculada da liberação, mostrada ao lado do status gravado.
export function situacaoFechamento(liberacao: LiberacaoFechamento, veiculos: VeiculoFechamento[], toleranciaPct: number) {
  const ativos = veiculos.filter((v) => v.ativo);
  const resumo = resumoCarga(liberacao, ativos);
  const todosFinalizados = ativos.length > 0 && ativos.every((v) => v.status === StatusVeiculo.FINALIZADO);
  const checklist = checklistFechamento(liberacao, ativos, toleranciaPct);

  let situacao: Situacao;
  if (liberacao.status === StatusLiberacao.CANCELADA) situacao = 'CANCELADA';
  else if (liberacao.status === StatusLiberacao.CONCLUIDA) situacao = 'CONCLUIDA';
  else if (liberacao.status === StatusLiberacao.SUSPENSA) situacao = 'SUSPENSA';
  else if (todosFinalizados && checklist.todas.length > 0) situacao = 'PENDENCIA_DADOS';
  else if (resumo.saldoProgramar > 0) situacao = 'FALTA_PROGRAMAR';
  else if (resumo.saldoCarregar > 0) situacao = 'FALTA_CARREGAR';
  else situacao = 'EM_FINALIZACAO';

  const ativa = liberacao.status === StatusLiberacao.ATIVA;
  return {
    ...resumo,
    // Compatibilidade: "saldo" é o saldo a programar (fardos ainda sem caminhão).
    saldo: resumo.saldoProgramar,
    todosFinalizados,
    situacao,
    // Checklist só faz sentido para instrução ativa (concluídas não são reavaliadas).
    pendencias: ativa ? checklist.todas : [],
    pendenciasInstrucao: ativa ? checklist.instrucao : [],
    pendenciasPorVeiculo: ativa ? checklist.veiculos : [],
    // Todos os veículos finalizados, mas com dado faltando: não conclui sozinha —
    // fica ativa (amarela) até corrigir ou um ADMIN fechar manualmente.
    aguardandoFechamento: ativa && todosFinalizados && checklist.todas.length > 0,
  };
}

const LIMPAR_FECHAMENTO_MANUAL = {
  fechamentoManual: false,
  fardosPendentesFechamento: null,
  pendenciasFechamento: null,
  motivoFechamento: null,
  fechamentoManualPor: null,
  fechamentoManualEm: null,
};

// Recalcula o carregado (cache) e aplica a regra de conclusão:
//  - conclui sozinha só com todos os veículos ativos FINALIZADO **e** checklist completo;
//  - já concluída continua concluída (regras novas não valem para o que já fechou);
//  - reabre se algum veículo ativo sair de FINALIZADO.
export async function reavaliarStatusLiberacao(liberacaoId: number) {
  const liberacao = await prisma.liberacao.findUnique({
    where: { id: liberacaoId },
    select: {
      status: true, totalFardos: true, pesoTotal: true, carregado: true,
      fechamentoManual: true, fardosPendentesFechamento: true, concluidaEm: true,
    },
  });
  if (!liberacao) return;

  const veiculos = await prisma.veiculo.findMany({ where: { liberacaoId }, select: SELECT_VEICULO_FECHAMENTO });
  const sit = situacaoFechamento(liberacao, veiculos, await toleranciaPesoFechamento());

  if (liberacao.carregado !== sit.carregado) {
    await prisma.liberacao.update({ where: { id: liberacaoId }, data: { carregado: sit.carregado } });
  }
  // Cancelada e suspensa não concluem nem reabrem sozinhas.
  if (liberacao.status === StatusLiberacao.CANCELADA || liberacao.status === StatusLiberacao.SUSPENSA) return;

  if (liberacao.status === StatusLiberacao.ATIVA) {
    if (sit.todosFinalizados && sit.pendencias.length === 0) {
      await prisma.liberacao.update({
        where: { id: liberacaoId },
        data: { status: StatusLiberacao.CONCLUIDA, ...LIMPAR_FECHAMENTO_MANUAL, concluidaEm: liberacao.concluidaEm ?? new Date() },
      });
    }
    return;
  }

  // CONCLUIDA
  if (!sit.todosFinalizados) {
    await prisma.liberacao.update({
      where: { id: liberacaoId },
      data: { status: StatusLiberacao.ATIVA, ...LIMPAR_FECHAMENTO_MANUAL, concluidaEm: null },
    });
    return;
  }
  if (liberacao.fechamentoManual) {
    // Fechada pelo ADMIN com pendência: se completou o checklist depois, vira conclusão normal.
    const ckl = checklistFechamento({ ...liberacao, status: StatusLiberacao.ATIVA }, veiculos, await toleranciaPesoFechamento());
    if (ckl.todas.length === 0) {
      await prisma.liberacao.update({ where: { id: liberacaoId }, data: LIMPAR_FECHAMENTO_MANUAL });
    } else {
      const pendentes = Math.max(0, sit.saldoProgramar);
      if (liberacao.fardosPendentesFechamento !== pendentes) {
        await prisma.liberacao.update({ where: { id: liberacaoId }, data: { fardosPendentesFechamento: pendentes } });
      }
    }
  }
}
