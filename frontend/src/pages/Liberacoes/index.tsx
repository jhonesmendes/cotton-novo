import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { salvarFiltrosLista } from './navegacao';
import api from '@/services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader';
import AlternarVisualizacao, { useModoVisualizacao } from '@/components/ui/AlternarVisualizacao';
import { useAuthStore } from '@/stores/auth.store';

const fechadaManual = (l: any) => l.status === 'CONCLUIDA' && l.fechamentoManual;

function DiasDeadline({ l }: { l: any }) {
  if (l.status === 'CONCLUIDA' || l.status === 'CANCELADA')
    return <span className="text-gray-600">{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline < 0) return <span className="text-red-600 font-bold">{l.diasParaDeadline}d</span>;
  if (l.diasParaDeadline <= 3) return <span className="text-orange-600 font-semibold">{l.diasParaDeadline}d</span>;
  return <span className="text-gray-600">{l.diasParaDeadline}d</span>;
}

function StatusLiberacao({ l }: { l: any }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      l.status === 'ATIVA' ? 'bg-green-100 text-green-700' :
      fechadaManual(l) ? 'bg-amber-100 text-amber-700' :
      l.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-700' :
      'bg-gray-100 text-gray-500'
    }`}>{l.status}</span>
  );
}

function AvisoFechamento({ l }: { l: any }) {
  if (fechadaManual(l))
    return (
      <p className="mt-1 text-[11px] font-medium text-amber-700">
        {l.fardosPendentesFechamento} fardos pendentes · fechada manualmente
      </p>
    );
  if (l.aguardandoFechamento)
    return (
      <p className="mt-1 text-[11px] font-medium text-amber-700">
        Faltam {l.saldo} fardos · veículos finalizados
      </p>
    );
  return null;
}

function CardLiberacao({ l }: { l: any }) {
  return (
    <Link to={`/liberacoes/${l.id}`}
      className={`flex flex-col gap-3 rounded-ui-lg border p-4 shadow-sm transition hover:shadow-md ${
        fechadaManual(l) ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-ui-border bg-ui-surface hover:border-ui-primary/40'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ui-primary break-words">{l.instrucao}</p>
          <p className="text-xs text-ui-text-muted">{l.clienteNome ?? l.cliente?.nome}</p>
        </div>
        <StatusLiberacao l={l} />
      </div>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ui-text-muted">Origem</dt>
        <dd className="truncate">{l.origemNome ?? l.terminal?.nome}</dd>
        <dt className="text-ui-text-muted">Coleta</dt>
        <dd className="truncate">{l.localColetaNome ?? l.localColeta?.nome}</dd>
        <dt className="text-ui-text-muted">Entrega</dt>
        <dd className="truncate">{l.localEntregaNome ?? l.localEntrega?.nome ?? '—'}</dd>
        <dt className="text-ui-text-muted">Destino</dt>
        <dd className="truncate">{l.destinoNome ?? l.destino?.nome}</dd>
      </dl>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-ui-border-subtle pt-3 text-center">
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Total</p>
          <p className="text-sm">{l.totalFardos}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Saldo</p>
          <p className="text-sm font-semibold">{l.saldo}</p>
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
  const podeCriar = useAuthStore((s) => s.user?.perfil) !== 'OPERADOR';
  // Filtros ficam na URL: ao abrir uma liberação e voltar, a lista volta
  // exatamente como estava (busca, filial, status e página).
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get('busca') ?? '';
  // Sem o parâmetro = padrão ATIVA; "status=" vazio = todos os status.
  const status = searchParams.get('status') ?? 'ATIVA';
  const origemId = searchParams.get('origemId') ?? '';
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
  });

  const { data, isLoading } = useQuery({
    queryKey: ['liberacoes', { busca, status, origemId, page }],
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
          placeholder="Instrução, placa ou motorista..."
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
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="ui-card-header flex items-center justify-between gap-3 py-3 text-sm text-ui-text-muted">
          <span>{data?.total ?? 0} liberações encontradas</span>
          <AlternarVisualizacao modo={modo} onChange={trocarModo} />
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : modo === 'cards' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {(data?.data ?? []).map((l: any) => <CardLiberacao key={l.id} l={l} />)}
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
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-right">Deadline</th>
                  <th className="px-4 py-3 text-right">Dias</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-subtle">
                {(data?.data ?? []).map((l: any) => (
                  <tr key={l.id} className={`transition-colors ${fechadaManual(l) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-ui-muted/60'}`}>
                    <td className="px-4 py-3 font-medium text-ui-primary">
                      <Link to={`/liberacoes/${l.id}`} className="hover:underline">{l.instrucao}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.clienteNome ?? l.cliente?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.origemNome ?? l.terminal?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.localColetaNome ?? l.localColeta?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.destinoNome ?? l.destino?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.localEntregaNome ?? l.localEntrega?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{l.totalFardos}</td>
                    <td className="px-4 py-3 text-right font-semibold">{l.saldo}</td>
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
