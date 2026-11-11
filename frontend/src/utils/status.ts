// Timeline do veículo (nov/2026): 8 etapas, nesta ordem.
export type VeiculoStatus =
  | 'AGUARDANDO_GR'
  | 'TRANSITO_CARREGAMENTO'
  | 'LOCAL'
  | 'MANIFESTADO'
  | 'FALTA_AGENDAR'
  | 'AGENDADO'
  | 'AGUARDANDO_DESCARGA'
  | 'FINALIZADO';

export const STATUS_OPTIONS: VeiculoStatus[] = [
  'AGUARDANDO_GR',
  'TRANSITO_CARREGAMENTO',
  'LOCAL',
  'MANIFESTADO',
  'FALTA_AGENDAR',
  'AGENDADO',
  'AGUARDANDO_DESCARGA',
  'FINALIZADO',
];

export const STATUS_LABELS: Record<VeiculoStatus, string> = {
  AGUARDANDO_GR: 'AGUARDANDO GR',
  TRANSITO_CARREGAMENTO: 'TRÂNSITO CARREGAMENTO',
  LOCAL: 'LOCAL',
  MANIFESTADO: 'MANIFESTADO',
  FALTA_AGENDAR: 'FALTA AGENDAR',
  AGENDADO: 'AGENDADO',
  AGUARDANDO_DESCARGA: 'AGUARDANDO DESCARGA',
  FINALIZADO: 'FINALIZADO',
};

export const STATUS_DESCRICOES: Record<VeiculoStatus, string> = {
  AGUARDANDO_GR: 'Aguardando liberação da gerenciadora de risco',
  TRANSITO_CARREGAMENTO: 'A caminho do local de carregamento',
  LOCAL: 'No local de carregamento, ainda não carregado',
  MANIFESTADO: 'Carregado e manifestado',
  FALTA_AGENDAR: 'Em trânsito, falta agendar a descarga',
  AGENDADO: 'Descarga agendada',
  AGUARDANDO_DESCARGA: 'No destino, aguardando descarga',
  FINALIZADO: 'Transporte finalizado',
};

// A partir de MANIFESTADO o veículo conta como "carregado"; antes, só "programado".
export const STATUS_CARREGADO: VeiculoStatus[] = ['MANIFESTADO', 'FALTA_AGENDAR', 'AGENDADO', 'AGUARDANDO_DESCARGA', 'FINALIZADO'];

export function isCarregado(status: VeiculoStatus): boolean {
  return STATUS_CARREGADO.includes(status);
}

// Deadline (de carregamento) só é cobrado de quem ainda não carregou.
export const STATUS_MONITORAMENTO: VeiculoStatus[] = STATUS_OPTIONS.filter((s) => !STATUS_CARREGADO.includes(s));

export function isStatusMonitorado(status: VeiculoStatus): boolean {
  return STATUS_MONITORAMENTO.includes(status);
}

// Situação calculada da liberação (ao lado do status gravado).
export type SituacaoLiberacao =
  | 'FALTA_PROGRAMAR' | 'FALTA_CARREGAR' | 'EM_FINALIZACAO' | 'PENDENCIA_DADOS'
  | 'CONCLUIDA' | 'SUSPENSA' | 'CANCELADA';

export const SITUACAO_LABELS: Record<SituacaoLiberacao, { label: string; className: string }> = {
  FALTA_PROGRAMAR: { label: 'Falta programar', className: 'bg-red-50 text-red-700 border-red-200' },
  FALTA_CARREGAR: { label: 'Falta carregar', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  EM_FINALIZACAO: { label: 'Em finalização', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  PENDENCIA_DADOS: { label: 'Pendência de dados', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  CONCLUIDA: { label: 'Concluída', className: 'bg-green-50 text-green-700 border-green-200' },
  SUSPENSA: { label: 'Suspensa', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CANCELADA: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export const STATUS_LIBERACAO_CLASSES: Record<string, string> = {
  ATIVA: 'bg-green-100 text-green-700',
  CONCLUIDA: 'bg-blue-100 text-blue-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
  SUSPENSA: 'bg-amber-100 text-amber-700',
};

// SM = status do "Monitoramento do Veículo" em si (campo próprio no veículo,
// independente do StatusVeiculo/andamento da carga acima).
export type StatusSM = 'PENDENTE' | 'ABERTA' | 'LIBERADA' | 'ENCERRADA';

export const SM_OPTIONS: StatusSM[] = ['PENDENTE', 'ABERTA', 'LIBERADA', 'ENCERRADA'];

export const SM_LABELS: Record<StatusSM, string> = {
  PENDENTE: 'PENDENTE',
  ABERTA: 'ABERTA',
  LIBERADA: 'LIBERADA',
  ENCERRADA: 'ENCERRADA',
};

// Status do rastreamento do veículo — independente do status/SM acima.
// PENDENTE = ainda não informado (padrão de todo veículo novo).
export type StatusRastreamento = 'PENDENTE' | 'RASTREADOR' | 'LOCALIZADO' | 'APLICATIVO' | 'NAO_RASTREADO';

export const RASTREAMENTO_OPTIONS: StatusRastreamento[] = ['PENDENTE', 'RASTREADOR', 'LOCALIZADO', 'APLICATIVO', 'NAO_RASTREADO'];

export const RASTREAMENTO_LABELS: Record<StatusRastreamento, string> = {
  PENDENTE: 'Pendente',
  RASTREADOR: 'Rastreador',
  LOCALIZADO: 'Localizado',
  APLICATIVO: 'Aplicativo',
  NAO_RASTREADO: 'Não rastreado',
};
