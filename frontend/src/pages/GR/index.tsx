import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth.store';
import { formatCpf, formatDateTime, formatTelefone } from '@/utils/format';
import { RASTREAMENTO_LABELS, RASTREAMENTO_OPTIONS, SM_LABELS, SM_OPTIONS, STATUS_LABELS, STATUS_OPTIONS, StatusSM, VeiculoStatus } from '@/utils/status';
import { RastreamentoIscaRapido } from '../Liberacoes/EdicaoRapida';

// Tela da Gerenciadora de Risco: todos os veículos ativos numa lista só, para
// validar placa e SM sem abrir liberação por liberação. A troca de SM aqui é o
// mesmo campo do veículo (vale na hora na tela da liberação e vai pro histórico).
const CORES_SM: Record<StatusSM, string> = {
  PENDENTE: 'border-amber-300 bg-amber-50 text-amber-800',
  ABERTA: 'border-blue-300 bg-blue-50 text-blue-800',
  LIBERADA: 'border-green-300 bg-green-50 text-green-800',
  ENCERRADA: 'border-gray-300 bg-gray-50 text-gray-600',
};

export default function GrPage() {
  const perfil = useAuthStore((s) => s.user?.perfil);
  const ehGr = perfil === 'GR';
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const f = {
    busca: sp.get('busca') ?? '',
    sm: sp.get('sm') ?? '',
    clienteId: sp.get('clienteId') ?? '',
    origemId: sp.get('origemId') ?? '',
    status: sp.get('status') ?? '',
    rastreamento: sp.get('rastreamento') ?? '',
    semIsca: sp.get('semIsca') ?? '',
  };
  const set = (campo: keyof typeof f, valor: string) => setSp((a) => { if (valor) a.set(campo, valor); else a.delete(campo); return a; }, { replace: true });
  const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);

  const { data, isLoading } = useQuery({
    queryKey: ['gr-veiculos', params.toString()],
    queryFn: () => api.get(`/gr/veiculos?${params}`).then((r) => r.data),
    refetchInterval: 60_000,
    placeholderData: (anterior) => anterior,
  });

  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const alterar = useMutation({
    mutationFn: ({ id, campos }: { id: number; campos: Record<string, unknown> }) => api.patch(`/gr/veiculos/${id}`, campos),
    onSuccess: () => {
      toast.success('Veículo atualizado');
      qc.invalidateQueries({ queryKey: ['gr-veiculos'] });
      qc.invalidateQueries({ queryKey: ['liberacao'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Erro ao atualizar'),
    onSettled: () => setSalvandoId(null),
  });
  const salvar = (id: number) => (campos: Record<string, unknown>) => { setSalvandoId(id); return alterar.mutateAsync({ id, campos }); };

  const c = data?.contadores;
  const contadores = [
    { rotulo: 'Pendentes', valor: c?.pendentes, filtro: 'PENDENTE', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
    { rotulo: 'Abertas', valor: c?.abertas, filtro: 'ABERTA', cls: 'border-blue-200 bg-blue-50 text-blue-800' },
    { rotulo: 'Liberadas', valor: c?.liberadas, filtro: 'LIBERADA', cls: 'border-green-200 bg-green-50 text-green-800', extra: c ? `${c.liberadasHoje} hoje` : '' },
    { rotulo: 'Encerradas', valor: c?.encerradas, filtro: 'ENCERRADA', cls: 'border-gray-200 bg-gray-50 text-gray-600' },
  ];

  return (
    <div className="ui-page space-y-5">
      <PageHeader title="GR — Gerenciadora de Risco"
        description={data?.filialFixa ? `Placas da filial ${data.filialFixa}` : 'Veículos das liberações em andamento: placa, SM, rastreamento e isca'} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {contadores.map((k) => (
          <button key={k.filtro} type="button" onClick={() => set('sm', f.sm === k.filtro ? '' : k.filtro)}
            className={`rounded-ui-md border p-3 text-center ${k.cls} ${f.sm === k.filtro ? 'ring-2 ring-ui-primary' : ''}`}>
            <div className="text-2xl font-bold">{k.valor ?? '—'}</div>
            <div className="text-xs font-medium">{k.rotulo}{k.extra ? ` · ${k.extra}` : ''}</div>
          </button>
        ))}
      </div>

      <div className="ui-card grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7">
        <input value={f.busca} onChange={(e) => set('busca', e.target.value)} placeholder="Placa, motorista, CPF ou instrução"
          className="ui-input col-span-2" />
        <select value={f.sm} onChange={(e) => set('sm', e.target.value)} className="ui-input">
          <option value="">SM: tudo menos encerrada</option>
          <option value="TODAS">SM: todas</option>
          {SM_OPTIONS.map((s) => <option key={s} value={s}>SM: {SM_LABELS[s]}</option>)}
        </select>
        {!data?.filialFixa && (
          <select value={f.origemId} onChange={(e) => set('origemId', e.target.value)} className="ui-input">
            <option value="">Todas filiais</option>
            {(data?.opcoes?.filiais ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        )}
        <select value={f.clienteId} onChange={(e) => set('clienteId', e.target.value)} className="ui-input">
          <option value="">Todos clientes</option>
          {(data?.opcoes?.clientes ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select value={f.status} onChange={(e) => set('status', e.target.value)} className="ui-input">
          <option value="">Todas etapas</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={f.rastreamento} onChange={(e) => set('rastreamento', e.target.value)} className="ui-input">
          <option value="">Rastreamento: todos</option>
          {RASTREAMENTO_OPTIONS.map((r) => <option key={r} value={r}>{RASTREAMENTO_LABELS[r]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ui-text">
          <input type="checkbox" checked={!!f.semIsca} onChange={(e) => set('semIsca', e.target.checked ? '1' : '')} />
          Sem isca
        </label>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="ui-card-header py-3 text-sm text-ui-text-muted">{data?.total ?? 0} veículo(s)</div>
        {isLoading ? <div className="p-8 text-center text-ui-text-muted">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                <tr>
                  <th className="px-3 py-3 text-left">Placa</th>
                  <th className="px-3 py-3 text-left">Motorista</th>
                  <th className="px-3 py-3 text-left">Instrução / Cliente</th>
                  <th className="px-3 py-3 text-left">Filial</th>
                  <th className="px-3 py-3 text-left">Origem → Destino</th>
                  <th className="px-3 py-3 text-left">Etapa</th>
                  <th className="px-3 py-3 text-left">SM</th>
                  <th className="px-3 py-3 text-left">Rastreamento / Isca</th>
                  <th className="px-3 py-3 text-left">Agendamento</th>
                  <th className="px-3 py-3 text-left">Última alteração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-subtle">
                {(data?.data ?? []).map((v: any) => (
                  <tr key={v.id} className="align-top hover:bg-ui-muted/50">
                    <td className="px-3 py-3">
                      <p className="font-mono font-bold tracking-wider text-ui-text">{v.placa}</p>
                      <p className="text-[10px] uppercase text-ui-text-muted">{v.modeloCarreta}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p className="font-semibold text-ui-text">{v.motoristaNome}</p>
                      <p className="text-ui-text-muted">{v.motoristaCpf ? formatCpf(v.motoristaCpf) : <span className="text-amber-600">sem CPF</span>}</p>
                      <p className="text-ui-text-muted">{formatTelefone(v.motoristaTelefone)}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {ehGr ? <p className="font-semibold text-ui-text">{v.instrucao}</p>
                        : <Link to={`/liberacoes/${v.liberacaoId}#veiculo-${v.id}`} className="font-semibold text-ui-primary hover:underline">{v.instrucao}</Link>}
                      <p className="text-ui-text-muted">{v.cliente}</p>
                      {v.liberacaoSuspensa && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">SUSPENSA</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-ui-text-muted">{v.filial}</td>
                    <td className="px-3 py-3 text-xs text-ui-text-muted">
                      <p>{v.origem} → {v.destino}</p>
                      <p>Coleta: {v.localColeta ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">{STATUS_LABELS[v.status as VeiculoStatus] ?? v.status}</td>
                    <td className="px-3 py-3">
                      <select value={v.statusSm} disabled={salvandoId === v.id}
                        onChange={(e) => salvar(v.id)({ statusSm: e.target.value }).catch(() => undefined)}
                        className={`rounded border px-2 py-1 text-xs font-semibold ${CORES_SM[v.statusSm as StatusSM]}`}>
                        {SM_OPTIONS.map((s) => <option key={s} value={s}>{SM_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <RastreamentoIscaRapido v={v} salvar={salvar(v.id)} desabilitado={salvandoId === v.id} />
                    </td>
                    <td className="px-3 py-3 text-xs text-ui-text-muted">{v.dataAgendamento ? formatDateTime(v.dataAgendamento) : '—'}</td>
                    <td className="px-3 py-3 text-xs text-ui-text-muted">
                      {v.ultimaAlteracao ? <><p>{v.ultimaAlteracao.usuario}</p><p>{formatDateTime(v.ultimaAlteracao.em)}</p></> : '—'}
                    </td>
                  </tr>
                ))}
                {!data?.data?.length && <tr><td colSpan={10} className="p-8 text-center text-ui-text-muted">Nenhum veículo para este filtro.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
