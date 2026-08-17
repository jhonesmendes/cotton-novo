


SOLICITADO
    ↓
FALTA CONTRATAR → FALTA AGENDAR → AGENDADO
    ↓
LIBERADO  ──────▶ [INÍCIA MONITORAMENTO DEADLINE]
    ↓
AGUARDANDO NFE / AGUARDANDO GR (paralelo)
    ↓
AGUARDANDO CARREGAMENTO
    ↓
CARREGADO
    ↓
EM TRANSITO
    ↓
AGUARDANDO DESCARGA
    ↓
FINALIZADO  ────▶ [PARA MONITORAMENTO]
----

// CONSTANTES
const STATUS_INICIAL = 'SOLICITADO';
const STATUS_FINAL = 'FINALIZADO';

// Status que ativam monitoramento de deadline
const STATUS_MONITORAMENTO = [
  'LIBERADO',
  'AGUARDANDO NFE',
  'AGUARDANDO GR',
  'AGUARDANDO CARREGAMENTO',
  'CARREGADO',
  'EM TRANSITO',
  'AGUARDANDO DESCARGA'
];

// Status que NÃO ativam monitoramento
const STATUS_SEM_MONITORAMENTO = [
  'SOLICITADO',
  'FALTA CONTRATAR',
  'FALTA AGENDAR',
  'AGENDADO',
  'FINALIZADO'
];

// Regra de disparo
function deveIniciarMonitoramento(novoStatus, statusAnterior) {
  // Inicia quando entra em um status de monitoramento
  // e não estava em um status de monitoramento antes
  const entraMonitoramento = STATUS_MONITORAMENTO.includes(novoStatus);
  const saiOperacao = statusAnterior === 'FINALIZADO';
  
  return entraMonitoramento && !saiOperacao;
}

function devePararMonitoramento(novoStatus) {
  return novoStatus === 'FINALIZADO';
}