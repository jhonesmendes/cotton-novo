import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { salvarFiltrosLista } from './navegacao';
import api from '@/services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth.store';

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
    queryKey: ['origens'],
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
        <div className="ui-card-header py-3 text-sm text-ui-text-muted">
          {data?.total ?? 0} liberações encontradas
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
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
                  <tr key={l.id} className={`transition-colors ${l.status === 'CONCLUIDA' && l.fechamentoManual ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-ui-muted/60'}`}>
                    <td className="px-4 py-3 font-medium text-ui-primary">
                      <Link to={`/liberacoes/${l.id}`} className="hover:underline">{l.instrucao}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.clienteNome ?? l.cliente?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.origemNome ?? l.terminal?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.localColetaNome ?? l.localColeta?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.destinoNome ?? l.destino?.nome}</td>
                    <td className="px-4 py-3 text-right">{l.totalFardos}</td>
                    <td className="px-4 py-3 text-right font-semibold">{l.saldo}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatDate(l.deadline)}</td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'CONCLUIDA' || l.status === 'CANCELADA'
                        ? <span className="text-gray-600">{l.diasParaDeadline}d</span>
                        : l.diasParaDeadline < 0
                          ? <span className="text-red-600 font-bold">{l.diasParaDeadline}d</span>
                          : l.diasParaDeadline <= 3
                            ? <span className="text-orange-600 font-semibold">{l.diasParaDeadline}d</span>
                            : <span className="text-gray-600">{l.diasParaDeadline}d</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        l.status === 'ATIVA' ? 'bg-green-100 text-green-700' :
                        l.status === 'CONCLUIDA' && l.fechamentoManual ? 'bg-amber-100 text-amber-700' :
                        l.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{l.status}</span>
                      {l.status === 'CONCLUIDA' && l.fechamentoManual && (
                        <p className="mt-1 text-[11px] font-medium text-amber-700 whitespace-nowrap">
                          {l.fardosPendentesFechamento} fardos pendentes · fechada manualmente
                        </p>
                      )}
                      {l.aguardandoFechamento && (
                        <p className="mt-1 text-[11px] font-medium text-amber-700 whitespace-nowrap">
                          Faltam {l.saldo} fardos · veículos finalizados
                        </p>
                      )}
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
