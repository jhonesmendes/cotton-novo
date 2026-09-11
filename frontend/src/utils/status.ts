export type VeiculoStatus =
  | 'SOLICITADO'
  | 'FALTA_CONTRATAR'
  | 'FALTA_AGENDAR'
  | 'AGENDADO'
  | 'LIBERADO'
  | 'AGUARDANDO_NFE'
  | 'AGUARDANDO_GR'
  | 'AGUARDANDO_CARREGAMENTO'
  | 'CARREGADO'
  | 'EM_TRANSITO'
  | 'AGUARDANDO_DESCARGA'
  | 'FINALIZADO'
  | 'CANCELADO';

export const STATUS_OPTIONS: VeiculoStatus[] = [
  'SOLICITADO',
  'FALTA_CONTRATAR',
  'FALTA_AGENDAR',
  'AGENDADO',
  'LIBERADO',
  'AGUARDANDO_NFE',
  'AGUARDANDO_GR',
  'AGUARDANDO_CARREGAMENTO',
  'CARREGADO',
  'EM_TRANSITO',
  'AGUARDANDO_DESCARGA',
  'FINALIZADO',
  'CANCELADO',
];

export const STATUS_LABELS: Record<VeiculoStatus, string> = {
  SOLICITADO: 'SOLICITADO',
  FALTA_CONTRATAR: 'FALTA CONTRATAR',
  FALTA_AGENDAR: 'FALTA AGENDAR',
  AGENDADO: 'AGENDADO',
  LIBERADO: 'LIBERADO',
  AGUARDANDO_NFE: 'AGUARDANDO NFE',
  AGUARDANDO_GR: 'AGUARDANDO GR',
  AGUARDANDO_CARREGAMENTO: 'AGUARDANDO CARREGAMENTO',
  CARREGADO: 'CARREGADO',
  EM_TRANSITO: 'EM TRANSITO',
  AGUARDANDO_DESCARGA: 'AGUARDANDO DESCARGA',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
};

export const STATUS_MONITORAMENTO: VeiculoStatus[] = [
  'LIBERADO',
  'AGUARDANDO_NFE',
  'AGUARDANDO_GR',
  'AGUARDANDO_CARREGAMENTO',
  'CARREGADO',
  'EM_TRANSITO',
  'AGUARDANDO_DESCARGA',
];

export const STATUS_SEM_MONITORAMENTO: VeiculoStatus[] = [
  'SOLICITADO',
  'FALTA_CONTRATAR',
  'FALTA_AGENDAR',
  'AGENDADO',
  'FINALIZADO',
  'CANCELADO',
];

export function isStatusMonitorado(status: VeiculoStatus): boolean {
  return STATUS_MONITORAMENTO.includes(status);
}

export function isStatusSemMonitoramento(status: VeiculoStatus): boolean {
  return STATUS_SEM_MONITORAMENTO.includes(status);
}

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
