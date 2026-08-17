import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { STATUS_OPTIONS, STATUS_LABELS } from '@/utils/status';

export interface FiltrosDashboardState {
  clienteId: string;
  origemId: string;
  terminalId: string;
  status: string;
  diasMax: string;
  busca: string;
}

interface Props {
  value: FiltrosDashboardState;
  onChange: (v: FiltrosDashboardState) => void;
}

export default function FiltrosDashboard({ value, onChange }: Props) {
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: () => api.get('/liberacoes?status=ATIVA&limit=1').then(() => api.get('/dashboard/kpis').then((r) => r.data.porCliente)) });
  const { data: origens } = useQuery({ queryKey: ['origens-kpi'], queryFn: () => api.get('/dashboard/kpis').then((r) => r.data.porFilial) });
  const { data: terminais } = useQuery({ queryKey: ['terminais'], queryFn: () => api.get('/terminais').then((r) => Array.isArray(r.data) ? r.data : r.data.data || []) });

  function set(field: keyof FiltrosDashboardState, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Busca (placa / motorista)</label>
          <input
            value={value.busca}
            onChange={(e) => set('busca', e.target.value)}
            placeholder="ABC-1234..."
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
          <select value={value.clienteId} onChange={(e) => set('clienteId', e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {(clientes ?? []).map((c: any, i: number) => (
              <option key={c.clienteId || i} value={c.clienteId}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Filial Embarcadora</label>
          <select value={value.origemId} onChange={(e) => set('origemId', e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            {(origens ?? []).map((o: any, i: number) => (
              <option key={o.origemId || i} value={o.origemId}>{o.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Origem</label>
          <select value={value.terminalId} onChange={(e) => set('terminalId', e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {(terminais ?? []).map((t: any, i: number) => (
              <option key={t.id || i} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status Veículo</label>
          <select value={value.status} onChange={(e) => set('status', e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Dias p/ vencer (máx)</label>
          <input
            type="number"
            min={0}
            max={365}
            value={value.diasMax}
            onChange={(e) => set('diasMax', e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
