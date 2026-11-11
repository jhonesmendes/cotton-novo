import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { salvarFiltrosLista } from './navegacao';
import { abrirLinha } from '@/utils/abrirLinha';
import api from '@/services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatDate, formatPeso } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader';
import AlternarVisualizacao, { useModoVisualizacao } from '@/components/ui/AlternarVisualizacao';
import { useAuthStore } from '@/stores/auth.store';
import { SITUACAO_LABELS, STATUS_LABELS, STATUS_LIBERACAO_CLASSES, SituacaoLiberacao, VeiculoStatus, isCarregado } from '@/utils/status';

const fechadaManual = (l: any) => l.status === 'CONCLUIDA' && l.fechamentoManual;
// Amarelo: precisa de atenção que não é prazo (dado faltando, suspensa, fechada com pendência).
const destacarAmarelo = (l: any) => fechadaManual(l) || l.situacao === 'PENDENCIA_DADOS' || l.status === 'SUSPENSA';

function DiasDeadline({ l }: { l: any }) {
  // Deadline é de carregamento: com tudo carregado não fica "vencido".
  if (l.status !== 'ATIVA' || l.prazoCumprido)
    return <span className="text-gray-600" title={l.prazoCumprido ? 'Tudo carregado' : undefined}>{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline < 0) return <span className="text-red-600 font-bold">{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline <= 3) return <span className="text-orange-600 font-semibold">{l.diasParaDeadline}d</span>;
  return <span className="text-gray-600">{l.diasParaDeadline}d</span>;
}

function StatusLiberacao({ l }: { l: any }) {
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

function AvisoFechamento({ l }: { l: any }) {
  if (fechadaManual(l))
    return (
      <p className="mt-1 text-[11px] font-medium text-amber-700">
        {l.fardosPendentesFechamento ? `${l.fardosPendentesFechamento} fardos pendentes · ` : ''}fechada manualmente
      </p>
    );
  if (l.aguardandoFechamento)
    return (
      <p className="mt-1 text-[11px] font-medium text-amber-700">
        {l.totalPendencias} pendência(s) de dados · veículos finalizados
      </p>
    );
  return null;
}

type Buscar = (texto: string) => void;

// Valor clicável: coloca o texto na busca (não abre a liberação).
function Filtravel({ texto, onBuscar, className = '' }: { texto?: string | null; onBuscar: Buscar; className?: string }) {
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
function corPlaca(status: VeiculoStatus) {
  if (status === 'FINALIZADO') return 'border-green-200 bg-green-50 text-green-700';
  if (isCarregado(status)) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function PlacasChips({ l, max = 4 }: { l: any; max?: number }) {
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
function FaixaTotais({ t }: { t?: any }) {
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

function CardLiberacao({ l, onBuscar }: { l: any; onBuscar: Buscar }) {
  return (
    <Link to={`/liberacoes/${l.id}`}
      className={`flex flex-col gap-3 rounded-ui-lg border p-4 shadow-sm transition hover:shadow-md ${
        destacarAmarelo(l) ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-ui-border bg-ui-surface hover:border-ui-primary/40'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ui-primary break-words">{l.instrucao}</p>
          <p className="text-xs text-ui-text-muted"><Filtravel texto={l.clienteNome ?? l.cliente?.nome} onBuscar={onBuscar} /></p>
        </div>
        <StatusLiberacao l={l} />
      </div>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ui-text-muted">Origem</dt>
        <dd className="truncate"><Filtravel texto={l.origemNome ?? l.terminal?.nome} onBuscar={onBuscar} /></dd>
        <dt className="text-ui-text-muted">Coleta</dt>
        <dd className="truncate"><Filtravel texto={l.localColetaNome ?? l.localColeta?.nome} onBuscar={onBuscar} /></dd>
        <dt className="text-ui-text-muted">Entrega</dt>
        <dd className="truncate"><Filtravel texto={l.localEntregaNome ?? l.localEntrega?.nome} onBuscar={onBuscar} /></dd>
        <dt className="text-ui-text-muted">Destino</dt>
        <dd className="truncate"><Filtravel texto={l.destinoNome ?? l.destino?.nome} onBuscar={onBuscar} /></dd>
      </dl>

      <PlacasChips l={l} />

      <div className="mt-auto grid grid-cols-4 gap-2 border-t border-ui-border-subtle pt-3 text-center">
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Total</p>
          <p className="text-sm">{l.totalFardos}</p>
        </div>
        <div title="Fardos ainda sem caminhão">
          <p className="text-[11px] uppercase text-ui-text-muted">A progr.</p>
          <p className="text-sm font-semibold">{l.saldo}</p>
        </div>
        <div title="Fardos ainda não carregados (antes de MANIFESTADO)">
          <p className="text-[11px] uppercase text-ui-text-muted">A carregar</p>
          <p className="text-sm">{l.saldoCarregar}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">{formatDate(l.deadline)}</p>
          <p className="text-sm"><DiasDeadline l={l} /></p>
        </div>
      </div>
      <AvisoFechamento l={l} />
    </Link>
  );
}

export default function LiberacoesPage() {
  const navigate = useNavigate();
  const podeCriar = useAuthStore((s) => s.user?.perfil) !== 'OPERADOR';
  // Filtros ficam na URL: ao abrir uma liberação e voltar, a lista volta
  // exatamente como estava (busca, filial, status e página).
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get('busca') ?? '';
  // Sem o parâmetro = padrão ATIVA; "status=" vazio = todos os status.
  const status = searchParams.get('status') ?? 'ATIVA';
  const origemId = searchParams.get('origemId') ?? '';
  // Vem do Dashboard (clique no card de KPI com cliente filtrado).
  const clienteId = searchParams.get('clienteId') ?? '';
  const page = Number(searchParams.get('page')) || 1;

  const atualizarFiltro = (campo: string, valor: string) =>
    setSearchParams((sp) => {
      sp.set(campo, valor);
      if (campo !== 'page') sp.delete('page');
      if (campo !== 'status' && !valor) sp.delete(campo);
      return sp;
    }, { replace: true });
  const setBusca = (v: string) => atualizarFiltro('busca', v);
  const setStatus = (v: string) => atualizarFiltro('status', v);
  const setOrigemId = (v: string) => atualizarFiltro('origemId', v);
  const setPage = (v: number | ((p: number) => number)) =>
    atualizarFiltro('page', String(typeof v === 'function' ? v(page) : v));

  useEffect(() => { salvarFiltrosLista(searchParams.toString()); }, [searchParams]);

  const [modo, trocarModo] = useModoVisualizacao('cotton:liberacoes:modo');

  const params = new URLSearchParams({
    page: String(page), limit: '50',
    ...(status && { status }),
    ...(busca && { busca }),
    ...(origemId && { origemId }),
    ...(clienteId && { clienteId }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['liberacoes', { busca, status, origemId, clienteId, page }],
    queryFn: () => api.get(`/liberacoes?${params}`).then((r) => r.data),
  });

  // "Origem" no modelo de dados representa a Filial Embarcadora.
  const { data: origens } = useQuery({
    queryKey: ['origens', 'lista-liberacoes'],
    queryFn: () => api.get('/origens?limit=1000').then((r) => r.data),
  });
  const listaOrigens = Array.isArray(origens) ? origens : origens?.data ?? [];

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Liberações" description="Instruções de carregamento" action={
        podeCriar && (
          <Link to="/liberacoes/nova" className="ui-btn-primary">
            <PlusIcon className="w-4 h-4" />
            Nova Liberação
          </Link>
        )
      } />

      <div className="ui-card flex flex-wrap gap-3 p-4">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: instrução, cliente, origem, coleta, destino, entrega, placa ou motorista..."
          className="ui-input min-w-[200px] flex-1" />
        <select value={origemId} onChange={(e) => setOrigemId(e.target.value)}
          className="ui-input w-auto">
          <option value="">Todas filiais</option>
          {listaOrigens.map((o: any) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="ui-input w-auto">
          <option value="">Todos status</option>
          <option value="ATIVA">Ativas</option>
          <option value="CONCLUIDA">Concluídas</option>
          <option value="SUSPENSA">Suspensas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
        {clienteId && (
          <button type="button" onClick={() => atualizarFiltro('clienteId', '')}
            className="flex items-center gap-1 self-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Cliente: {data?.data?.[0]?.clienteNome ?? data?.data?.[0]?.cliente?.nome ?? `#${clienteId}`} ✕
          </button>
        )}
      </div>

      <div className="ui-card overflow-hidden">
        <div className="ui-card-header flex items-center justify-between gap-3 py-3 text-sm text-ui-text-muted">
          <span>{data?.total ?? 0} liberações encontradas</span>
          <AlternarVisualizacao modo={modo} onChange={trocarModo} />
        </div>
        <FaixaTotais t={data?.totais} />
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : modo === 'cards' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {(data?.data ?? []).map((l: any) => <CardLiberacao key={l.id} l={l} onBuscar={setBusca} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Instrução</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Origem</th>
                  <th className="px-4 py-3 text-left">Local de Coleta</th>
                  <th className="px-4 py-3 text-left">Destino</th>
                  <th className="px-4 py-3 text-left">Local de Entrega</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right" title="Fardos ainda sem caminhão">A programar</th>
                  <th className="px-4 py-3 text-right" title="Fardos ainda não carregados (antes de MANIFESTADO)">A carregar</th>
                  <th className="px-4 py-3 text-right">Deadline</th>
                  <th className="px-4 py-3 text-right">Dias</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-subtle">
                {(data?.data ?? []).map((l: any) => (
                  <tr key={l.id} onClick={(e) => abrirLinha(e, `/liberacoes/${l.id}`, navigate)}
                    className={`cursor-pointer transition-colors ${destacarAmarelo(l) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-ui-muted/60'}`}>
                    <td className="px-4 py-3 font-medium text-ui-primary">
                      <Link to={`/liberacoes/${l.id}`} className="hover:underline">{l.instrucao}</Link>
                      <div className="mt-1"><PlacasChips l={l} max={3} /></div>
                    </td>
                    <td className="px-4 py-3 text-xs"><Filtravel texto={l.clienteNome ?? l.cliente?.nome} onBuscar={setBusca} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500"><Filtravel texto={l.origemNome ?? l.terminal?.nome} onBuscar={setBusca} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500"><Filtravel texto={l.localColetaNome ?? l.localColeta?.nome} onBuscar={setBusca} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500"><Filtravel texto={l.destinoNome ?? l.destino?.nome} onBuscar={setBusca} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500"><Filtravel texto={l.localEntregaNome ?? l.localEntrega?.nome} onBuscar={setBusca} /></td>
                    <td className="px-4 py-3 text-right">{l.totalFardos}</td>
                    <td className="px-4 py-3 text-right font-semibold">{l.saldo}</td>
                    <td className="px-4 py-3 text-right">{l.saldoCarregar}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatDate(l.deadline)}</td>
                    <td className="px-4 py-3 text-right"><DiasDeadline l={l} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusLiberacao l={l} />
                      <AvisoFechamento l={l} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/liberacoes/${l.id}`} className="text-xs text-blue-600 hover:underline">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.total > 50 && (
          <div className="flex justify-between border-t border-ui-border-subtle px-5 py-3 text-sm text-ui-text-muted">
            <span>Página {page}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="ui-btn-outline min-h-0 px-3 py-1 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= data.total}
                className="ui-btn-outline min-h-0 px-3 py-1 disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
