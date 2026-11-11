import { formatDateTime } from '@/utils/format';
import { STATUS_LABELS, SM_LABELS, RASTREAMENTO_LABELS, VeiculoStatus, StatusSM, StatusRastreamento } from '@/utils/status';
import { labelCampo } from '@/utils/auditoria';

// Texto curto de cada evento do feed "Atividade ao vivo" (vem do histórico de alterações).
export function descreverAtividade(a: any): string {
  if (a.tabela === 'Veiculo' && a.acao === 'INSERT') return 'veículo lançado';
  // Exclusão definitiva (antes da inativação existir) não tem "depois".
  if (a.acao === 'DELETE') return a.tabela === 'Veiculo' ? 'veículo excluído' : 'registro excluído';
  const partes: string[] = [];
  if (a.campos.includes('status') && a.depois.status) {
    const r = (s: string) => (a.tabela === 'Veiculo' ? STATUS_LABELS[s as VeiculoStatus] ?? s : s);
    partes.push(`${a.tabela === 'Liberacao' ? 'liberação ' : ''}${r(a.antes.status)} → ${r(a.depois.status)}`);
  }
  if (a.campos.includes('statusSm') && a.depois.statusSm) partes.push(`SM ${SM_LABELS[a.depois.statusSm as StatusSM] ?? a.depois.statusSm}`);
  if (a.campos.includes('dataAgendamento')) partes.push(a.depois.dataAgendamento ? `agendado ${formatDateTime(a.depois.dataAgendamento)}` : 'agendamento removido');
  if (a.campos.includes('ativo')) partes.push(a.depois.ativo ? 'reativado' : 'inativado');
  if (a.campos.includes('statusRastreamento') && a.depois.statusRastreamento) {
    partes.push(`rastreamento ${RASTREAMENTO_LABELS[a.depois.statusRastreamento as StatusRastreamento] ?? a.depois.statusRastreamento}`);
  }
  if (a.campos.includes('possuiIsca') || a.campos.includes('numeroIsca')) {
    partes.push(a.depois.possuiIsca === false ? 'sem isca' : a.depois.numeroIsca ? `isca ${a.depois.numeroIsca}` : 'isca alterada');
  }
  // Demais campos: nome legível (o mesmo do histórico de alterações).
  return partes.join(' · ') || a.campos.map(labelCampo).join(', ');
}

// Tipo do evento, para escolher o ícone no feed.
export type TipoEvento = 'lancado' | 'etapa' | 'sm' | 'agenda' | 'inativo' | 'rastreio' | 'outro';
export function tipoAtividade(a: any): TipoEvento {
  if (a.tabela === 'Veiculo' && a.acao === 'INSERT') return 'lancado';
  if (a.campos.includes('ativo') || a.acao === 'DELETE') return 'inativo';
  if (a.campos.includes('status')) return 'etapa';
  if (a.campos.includes('statusSm')) return 'sm';
  if (a.campos.includes('dataAgendamento')) return 'agenda';
  if (a.campos.includes('statusRastreamento') || a.campos.includes('possuiIsca') || a.campos.includes('numeroIsca')) return 'rastreio';
  return 'outro';
}

// "agora", "há 14 min", "há 3 h", "ontem", senão a data.
export function tempoRelativo(iso: string) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'agora';
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  if (seg < 172800) return 'ontem';
  return formatDateTime(iso);
}
