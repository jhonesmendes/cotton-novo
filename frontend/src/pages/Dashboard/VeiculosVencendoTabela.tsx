import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import UrgenciaBadge from '@/components/UrgenciaBadge';
import { FiltrosDashboardState } from './FiltrosDashboard';
import { PhoneIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/format';

interface Props { filtros: FiltrosDashboardState; }

export default function VeiculosVencendoTabela({ filtros }: Props) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: '50',
    diasMax: filtros.diasMax || '30',
    ...(filtros.clienteId && { clienteId: filtros.clienteId }),
    ...(filtros.origemId && { origemId: filtros.origemId }),
    ...(filtros.terminalId && { terminalId: filtros.terminalId }),
    ...(filtros.status && { status: filtros.status }),
    ...(filtros.busca && { placa: filtros.busca }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['veiculos-vencendo', filtros, page],
    queryFn: () => api.get(`/dashboard/veiculos-vencendo?${params}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="ui-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="ui-card overflow-hidden">
      <div className="ui-card-header flex items-center justify-between">
        <h2 className="font-semibold text-ui-text">
          Veículos com Deadline Próximo
          <span className="ml-2 text-sm font-normal text-gray-500">({total} registros)</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Urgência</th>
              <th className="px-4 py-3 text-left">Placa</th>
              <th className="px-4 py-3 text-left">Instrução</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Filial</th>
              <th className="px-4 py-3 text-left">Terminal</th>
              <th className="px-4 py-3 text-right">Dias p/ vencer</th>
              <th className="px-4 py-3 text-left">Motorista</th>
              <th className="px-4 py-3 text-left">Carreta</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Deadline</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-subtle">
            {items.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-gray-400">
                  Nenhum veículo encontrado
                </td>
              </tr>
            )}
            {items.map((v: any) => (
              <tr key={v.id} className="transition-colors hover:bg-ui-muted/60">
                <td className="px-4 py-3">
                  <UrgenciaBadge nivel={v.urgencia} />
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-gray-800">{v.placa}</td>
                <td className="px-4 py-3">
                  <Link to={`/liberacoes/${v.liberacaoId}`} className="text-ui-primary hover:underline">
                    {v.liberacao?.instrucao}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{v.liberacao?.cliente?.nome}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{v.liberacao?.origem?.nome}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{v.liberacao?.terminal?.nome}</td>
                <td className="px-4 py-3 text-right">
                  <DiasParaVencer dias={v.diasParaVencer} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-700 text-xs">{v.motoristaNome}</div>
                  <a
                    href={`https://wa.me/55${v.motoristaTelefone?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                  >
                    <PhoneIcon className="w-3 h-3" />
                    {v.motoristaTelefone}
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{v.modeloCarreta?.nomeDescricao}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {v.liberacao?.totalFardos - v.liberacao?.carregado}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {formatDate(v.liberacao?.deadline)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link to={`/liberacoes/${v.liberacaoId}`} title="Editar">
                    <PencilSquareIcon className="w-4 h-4 text-gray-400 hover:text-ui-primary inline" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="px-5 py-3 border-t flex items-center justify-between text-sm text-gray-500">
          <span>Página {page} — {total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}
              className="px-3 py-1 border rounded disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiasParaVencer({ dias }: { dias: number }) {
  if (dias < 0) return <span className="text-red-600 font-bold">{dias} dias</span>;
  if (dias === 0) return <span className="text-red-600 font-bold">Hoje</span>;
  if (dias <= 1) return <span className="text-orange-600 font-bold">{dias} dia</span>;
  if (dias <= 3) return <span className="text-amber-600 font-semibold">{dias} dias</span>;
  if (dias <= 7) return <span className="text-yellow-600">{dias} dias</span>;
  return <span className="text-green-600">{dias} dias</span>;
}
