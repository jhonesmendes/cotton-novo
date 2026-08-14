import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/services/api';
import UrgenciaBadge from '@/components/UrgenciaBadge';
import { PhoneIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { formatDate } from '@/utils/format';

const URGENCIA_OPTIONS = [
  { value: '', label: 'Todas urgências' },
  { value: 'VENCIDO', label: '🔴 Vencido' },
  { value: 'HOJE', label: '🔴 Hoje' },
  { value: 'CRITICO', label: '🟠 Crítico (≤1 dia)' },
  { value: 'ALERTA', label: '🟡 Alerta (1–3 dias)' },
  { value: 'MONITORAR', label: '🟡 Monitorar (3–7 dias)' },
];

export default function AlertasPage() {
  const [filtros, setFiltros] = useState({
    urgencia: '', clienteId: '', origemId: '',
    motorista: '', diasMax: '7',
  });
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page), limit: '50',
    diasMax: filtros.diasMax,
    ...(filtros.urgencia && { urgencia: filtros.urgencia }),
    ...(filtros.clienteId && { clienteId: filtros.clienteId }),
    ...(filtros.origemId && { origemId: filtros.origemId }),
    ...(filtros.motorista && { motorista: filtros.motorista }),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alertas', filtros, page],
    queryFn: () => api.get(`/alertas?${params}`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const sumario = data?.sumario;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas de Deadline</h1>
        <p className="text-gray-500 text-sm">Cargas com prazo crítico ou vencido</p>
      </div>

      {/* Sumário */}
      {sumario && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Vencidos', val: sumario.vencidos, cls: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Hoje',     val: sumario.hoje,     cls: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Críticos', val: sumario.criticos,  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Alerta',   val: sumario.alerta,    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Monitorar',val: sumario.monitorar, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Urgência</label>
            <select value={filtros.urgencia}
              onChange={(e) => setFiltros((f) => ({ ...f, urgencia: e.target.value }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
              {URGENCIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Dias p/ vencer (máx)</label>
            <input type="number" min={0} max={30} value={filtros.diasMax}
              onChange={(e) => setFiltros((f) => ({ ...f, diasMax: e.target.value }))}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Motorista / Telefone</label>
            <input value={filtros.motorista}
              onChange={(e) => setFiltros((f) => ({ ...f, motorista: e.target.value }))}
              placeholder="Nome ou número..."
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={() => refetch()}
              className="w-full bg-green-700 text-white text-sm py-1.5 rounded hover:bg-green-800">
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Veículos com Deadline Crítico
            <span className="ml-2 text-sm font-normal text-gray-500">({data?.total ?? 0} registros)</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando alertas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-3 text-left">Nível</th>
                  <th className="px-3 py-3 text-left">Placa</th>
                  <th className="px-3 py-3 text-left">Instrução</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Filial</th>
                  <th className="px-3 py-3 text-left">Terminal</th>
                  <th className="px-3 py-3 text-left">Motorista</th>
                  <th className="px-3 py-3 text-left">Telefone</th>
                  <th className="px-3 py-3 text-left">Carreta</th>
                  <th className="px-3 py-3 text-right">Fardos pendentes</th>
                  <th className="px-3 py-3 text-right font-bold">Dias p/ vencer</th>
                  <th className="px-3 py-3 text-right">Deadline</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-10 text-gray-400">
                      Nenhum alerta crítico encontrado
                    </td>
                  </tr>
                )}
                {(data?.data ?? []).map((v: any) => (
                  <tr key={v.id}
                    className={`hover:bg-gray-50 ${v.nivel === 'VENCIDO' || v.nivel === 'HOJE' ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3"><UrgenciaBadge nivel={v.nivel} /></td>
                    <td className="px-3 py-3 font-mono font-bold text-gray-800">{v.placa}</td>
                    <td className="px-3 py-3">
                      <Link to={`/liberacoes/${v.liberacaoId}`}
                        className="text-green-700 hover:underline text-xs font-medium">
                        {v.instrucao}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs">{v.cliente}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{v.filial}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{v.terminal}</td>
                    <td className="px-3 py-3 text-xs">{v.motoristaNome}</td>
                    <td className="px-3 py-3 text-xs">
                      <a href={`https://wa.me/55${v.motoristaTelefone?.replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-green-600 hover:text-green-800">
                        <PhoneIcon className="w-3 h-3" />
                        {v.motoristaTelefone}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{v.modeloCarreta}</td>
                    <td className="px-3 py-3 text-right font-semibold">{v.fardosPendentes}</td>
                    <td className="px-3 py-3 text-right">
                      <DiasParaVencerBold dias={v.diasParaVencer} />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-500">{formatDate(v.deadline)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {v.statusVeiculo?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <a href={`https://wa.me/55${v.motoristaTelefone?.replace(/\D/g, '')}`}
                          target="_blank" rel="noreferrer" title="WhatsApp motorista">
                          <PhoneIcon className="w-4 h-4 text-green-600 hover:text-green-800" />
                        </a>
                        <Link to={`/liberacoes/${v.liberacaoId}`} title="Editar instrução">
                          <PencilSquareIcon className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                        </Link>
                        <Link to={`/liberacoes/${v.liberacaoId}`} title="Marcar concluído">
                          <CheckIcon className="w-4 h-4 text-gray-400 hover:text-green-600" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.total > 50 && (
          <div className="px-5 py-3 border-t flex justify-between text-sm text-gray-500">
            <span>Página {page}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= data.total}
                className="px-3 py-1 border rounded disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiasParaVencerBold({ dias }: { dias: number }) {
  if (dias < 0) return <span className="text-red-700 font-bold text-base">{dias}d</span>;
  if (dias === 0) return <span className="text-red-700 font-bold text-base">Hoje</span>;
  if (dias === 1) return <span className="text-orange-600 font-bold">{dias}d</span>;
  if (dias <= 3) return <span className="text-amber-600 font-semibold">{dias}d</span>;
  return <span className="text-yellow-600">{dias}d</span>;
}
