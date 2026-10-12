import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import UrgenciaBadge from '@/components/UrgenciaBadge';
import { FiltrosDashboardState } from './FiltrosDashboard';
import { PhoneIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/format';
import AlternarVisualizacao, { useModoVisualizacao } from '@/components/ui/AlternarVisualizacao';

interface Props { filtros: FiltrosDashboardState; }

export default function VeiculosVencendoTabela({ filtros }: Props) {
  const [page, setPage] = useState(1);
  const [modo, trocarModo] = useModoVisualizacao('cotton:dashboard:modo');

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
      <div className="ui-card-header flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ui-text">
          Veículos com Deadline Próximo
          <span className="ml-2 text-sm font-normal text-gray-500">({total} registros)</span>
        </h2>
        <AlternarVisualizacao modo={modo} onChange={trocarModo} />
      </div>

      {modo === 'cards' ? (
        items.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Nenhum veículo encontrado</div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((v: any) => <CardVeiculo key={v.id} v={v} />)}
          </div>
        )
      ) : (
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
      )}

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

function CardVeiculo({ v }: { v: any }) {
  return (
    <div className="flex flex-col gap-3 rounded-ui-lg border border-ui-border bg-ui-surface p-4 shadow-sm transition hover:border-ui-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-gray-800">{v.placa}</p>
          <Link to={`/liberacoes/${v.liberacaoId}`} className="text-sm text-ui-primary hover:underline break-words">
            {v.liberacao?.instrucao}
          </Link>
          <p className="text-xs text-ui-text-muted">{v.liberacao?.cliente?.nome}</p>
        </div>
        <UrgenciaBadge nivel={v.urgencia} />
      </div>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ui-text-muted">Filial</dt>
        <dd className="truncate">{v.liberacao?.origem?.nome}</dd>
        <dt className="text-ui-text-muted">Terminal</dt>
        <dd className="truncate">{v.liberacao?.terminal?.nome}</dd>
        <dt className="text-ui-text-muted">Motorista</dt>
        <dd className="min-w-0">
          <span className="block truncate">{v.motoristaNome}</span>
          {v.motoristaTelefone && (
            <a
              href={`https://wa.me/55${v.motoristaTelefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-green-600 hover:text-green-800 inline-flex items-center gap-1"
            >
              <PhoneIcon className="w-3 h-3" />
              {v.motoristaTelefone}
            </a>
          )}
        </dd>
        <dt className="text-ui-text-muted">Carreta</dt>
        <dd className="truncate">{v.modeloCarreta?.nomeDescricao}</dd>
      </dl>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-ui-border-subtle pt-3 text-center">
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Vence em</p>
          <p className="text-sm"><DiasParaVencer dias={v.diasParaVencer} /></p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Saldo</p>
          <p className="text-sm font-semibold text-gray-800">{v.liberacao?.totalFardos - v.liberacao?.carregado}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-ui-text-muted">Deadline</p>
          <p className="text-sm text-gray-500">{formatDate(v.liberacao?.deadline)}</p>
        </div>
      </div>
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
