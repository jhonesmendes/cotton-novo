import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth.store';

export default function LiberacoesPage() {
  const podeCriar = useAuthStore((s) => s.user?.perfil) !== 'OPERADOR';
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('ATIVA');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page), limit: '50',
    ...(status && { status }),
    ...(busca && { busca }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['liberacoes', { busca, status, page }],
    queryFn: () => api.get(`/liberacoes?${params}`).then((r) => r.data),
  });

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
        <input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }}
          placeholder="Instrução, placa ou motorista..."
          className="ui-input min-w-[200px] flex-1" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
                  <th className="px-4 py-3 text-left">Filial Embarcadora</th>
                  <th className="px-4 py-3 text-left">Origem</th>
                  <th className="px-4 py-3 text-left">Local de Coleta</th>
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
                  <tr key={l.id} className="transition-colors hover:bg-ui-muted/60">
                    <td className="px-4 py-3 font-medium text-ui-primary">
                      <Link to={`/liberacoes/${l.id}`} className="hover:underline">{l.instrucao}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.clienteNome ?? l.cliente?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.filialNome ?? l.origem?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.origemNome ?? l.terminal?.nome}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{l.localColetaNome ?? l.localColeta?.nome}</td>
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
                        l.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{l.status}</span>
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
