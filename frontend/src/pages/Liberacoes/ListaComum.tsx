import { useNavigate } from 'react-router-dom';
import { formatPeso } from '@/utils/format';
import { SITUACAO_LABELS, STATUS_LABELS, STATUS_LIBERACAO_CLASSES, SituacaoLiberacao, VeiculoStatus, isCarregado } from '@/utils/status';

// Peças comuns da lista de liberações (tabela, cards e as variações por estilo).
export const fechadaManual = (l: any) => l.status === 'CONCLUIDA' && l.fechamentoManual;
// Amarelo: precisa de atenção que não é prazo (dado faltando, suspensa, fechada com pendência).
export const destacarAmarelo = (l: any) => fechadaManual(l) || l.situacao === 'PENDENCIA_DADOS' || l.status === 'SUSPENSA';

export function DiasDeadline({ l }: { l: any }) {
  // Deadline é de carregamento: com tudo carregado não fica "vencido".
  if (l.status !== 'ATIVA' || l.prazoCumprido)
    return <span className="text-gray-600" title={l.prazoCumprido ? 'Tudo carregado' : undefined}>{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline < 0) return <span className="text-red-600 font-bold">{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline <= 3) return <span className="text-orange-600 font-semibold">{l.diasParaDeadline}d</span>;
  return <span className="text-gray-600">{l.diasParaDeadline}d</span>;
}

export function StatusLiberacao({ l }: { l: any }) {
  const situacao = SITUACAO_LABELS[l.situacao as SituacaoLiberacao];
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        fechadaManual(l) ? 'bg-amber-100 text-amber-700' : STATUS_LIBERACAO_CLASSES[l.status] ?? 'bg-gray-100 text-gray-500'
      }`}>{l.status}</span>
      {l.status === 'ATIVA' && situacao && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${situacao.className}`}>
          {situacao.label}{l.situacao === 'PENDENCIA_DADOS' && l.totalPendencias ? ` (${l.totalPendencias})` : ''}
        </span>
      )}
    </span>
  );
}

export function AvisoFechamento({ l }: { l: any }) {
  if (fechadaManual(l))
    return (
      <p className="mt-1 max-w-[190px] whitespace-normal text-[11px] font-medium text-amber-700">
        {l.fardosPendentesFechamento ? `${l.fardosPendentesFechamento} fardos pendentes · ` : ''}fechada manualmente
      </p>
    );
  if (l.aguardandoFechamento)
    return (
      <p className="mt-1 max-w-[190px] whitespace-normal text-[11px] font-medium text-amber-700">
        {l.totalPendencias} pendência(s) de dados · veículos finalizados
      </p>
    );
  return null;
}

export type Buscar = (texto: string) => void;

// Valor clicável: coloca o texto na busca (não abre a liberação).
export function Filtravel({ texto, onBuscar, className = '' }: { texto?: string | null; onBuscar: Buscar; className?: string }) {
  if (!texto) return <span className={className}>—</span>;
  const buscar = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); onBuscar(texto); };
  return (
    <span role="button" tabIndex={0} title={`Filtrar por "${texto}"`} onClick={buscar}
      onKeyDown={(e) => { if (e.key === 'Enter') buscar(e); }}
      className={`cursor-pointer hover:text-ui-primary hover:underline ${className}`}>
      {texto}
    </span>
  );
}

// Placas dos veículos ativos, coloridas pela etapa; clique abre o detalhe já no veículo.
export function corPlaca(status: VeiculoStatus) {
  if (status === 'FINALIZADO') return 'border-green-200 bg-green-50 text-green-700';
  if (isCarregado(status)) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export function PlacasChips({ l, max = 4 }: { l: any; max?: number }) {
  const navigate = useNavigate();
  const ativos = (l.veiculos ?? []).filter((v: any) => v.ativo);
  if (!ativos.length) return <span className="text-[10px] text-ui-text-muted">sem veículo</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ativos.slice(0, max).map((v: any) => (
        <span key={v.id} role="button" tabIndex={0}
          title={`${v.placa} · ${STATUS_LABELS[v.status as VeiculoStatus] ?? v.status} · ${v.qtdFardos} fardos`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/liberacoes/${l.id}#veiculo-${v.id}`); }}
          className={`cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold hover:opacity-80 ${corPlaca(v.status)}`}>
          {v.placa}
        </span>
      ))}
      {ativos.length > max && (
        <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500" title={ativos.slice(max).map((v: any) => v.placa).join(', ')}>
          +{ativos.length - max}
        </span>
      )}
    </div>
  );
}

// Faixa de totais de tudo o que o filtro traz (todas as páginas, não só a visível).
export function FaixaTotais({ t }: { t?: any }) {
  if (!t) return null;
  const n = (v: number) => v.toLocaleString('pt-BR');
  const itens = [
    { rotulo: 'Liberações', valor: n(t.liberacoes) },
    { rotulo: 'Total', valor: `${n(t.totalFardos)} fardos` },
    { rotulo: 'Programado', valor: n(t.programado) },
    { rotulo: 'Carregado', valor: n(t.carregado) },
    { rotulo: 'A programar', valor: n(t.saldoProgramar), destaque: t.saldoProgramar > 0 },
    { rotulo: 'A carregar', valor: n(t.saldoCarregar) },
    { rotulo: 'Peso', valor: formatPeso(t.pesoTotal), dica: t.semPeso ? `${t.semPeso} liberação(ões) sem peso informado` : undefined },
    { rotulo: 'Vencidas', valor: n(t.vencidas), alerta: t.vencidas > 0 },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-ui-border-subtle bg-ui-muted/40 px-5 py-3 text-xs">
      {itens.map((i) => (
        <div key={i.rotulo} title={i.dica}>
          <span className="text-ui-text-muted">{i.rotulo} </span>
          <span className={`font-semibold ${i.alerta ? 'text-red-600' : i.destaque ? 'text-orange-600' : 'text-ui-text'}`}>{i.valor}</span>
          {i.dica && <span className="text-ui-text-muted"> *</span>}
        </div>
      ))}
    </div>
  );
}

