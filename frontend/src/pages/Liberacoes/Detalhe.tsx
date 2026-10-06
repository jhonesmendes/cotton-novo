import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, formatMoney, formatTelefone } from '@/utils/format';
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_SEM_MONITORAMENTO, SM_OPTIONS, SM_LABELS, RASTREAMENTO_LABELS } from '@/utils/status';
import UrgenciaBadge from '@/components/UrgenciaBadge';
import ConfirmModal from '@/components/ConfirmModal';
import TimelineStatus from '@/components/TimelineStatus';
import { PlusIcon, PencilSquareIcon, TrashIcon, PhoneIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon, ClockIcon } from '@heroicons/react/24/outline';
import VeiculoModal from './VeiculoModal';
import { useAuthStore } from '@/stores/auth.store';
import AlteracoesDetalhe from '@/components/AlteracoesDetalhe';
import { ACAO_LABELS, RegistroAuditoria, labelCampo, labelTabela } from '@/utils/auditoria';

export default function LiberacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const perfil = useAuthStore((s) => s.user?.perfil);
  const podeEditarLiberacao = perfil !== 'OPERADOR';
  const podeVerHistorico = perfil !== 'CLIENTE';
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const navigate = useNavigate();
  const [veiculoModal, setVeiculoModal] = useState<'novo' | number | null>(null);
  const [expandedTimeline, setExpandedTimeline] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'veiculo' | 'liberacao'; id?: number } | null>(null);
  // Oculta os valores de frete antes de tirar print pra enviar pra fora — o valor
  // combinado com o motorista/empresa não pode aparecer no print.
  const [ocultarValores, setOcultarValores] = useState(false);
  const qc = useQueryClient();

  const { data: lib, isLoading } = useQuery({
    queryKey: ['liberacao', id],
    queryFn: () => api.get(`/liberacoes/${id}`).then((r) => r.data),
  });

  // Chave começa com ['liberacao', id] — os invalidateQueries das mutações já recarregam o histórico junto.
  const { data: historico, isLoading: carregandoHistorico } = useQuery<RegistroAuditoria[]>({
    queryKey: ['liberacao', id, 'historico'],
    queryFn: () => api.get(`/auditoria/liberacao/${id}`).then((r) => r.data),
    enabled: podeVerHistorico && historicoAberto,
  });

  const deletarVeiculo = useMutation({
    mutationFn: (vid: number) => api.delete(`/veiculos/${vid}`),
    onSuccess: () => {
      toast.success('Veículo removido com sucesso');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      setConfirmDelete(null);
    },
    onError: () => toast.error('Erro ao remover veículo'),
  });

  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

  const atualizarStatusVeiculo = useMutation({
    mutationFn: ({ veiculoId, status }: { veiculoId: number; status: string }) =>
      api.put(`/veiculos/${veiculoId}`, { status }),
    onSuccess: () => {
      toast.success('Status do veículo atualizado');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      setSavingStatusId(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar status do veículo');
      setSavingStatusId(null);
    },
  });

  const [savingSmId, setSavingSmId] = useState<number | null>(null);

  const atualizarSmVeiculo = useMutation({
    mutationFn: ({ veiculoId, statusSm }: { veiculoId: number; statusSm: string }) =>
      api.put(`/veiculos/${veiculoId}`, { statusSm }),
    onSuccess: () => {
      toast.success('SM do veículo atualizado');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      setSavingSmId(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar SM do veículo');
      setSavingSmId(null);
    },
  });

  const deletarLiberacao = useMutation({
    mutationFn: () => api.delete(`/liberacoes/${id}`),
    onSuccess: () => {
      toast.success('Liberação removida com sucesso');
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      navigate('/liberacoes');
    },
    onError: () => toast.error('Erro ao remover liberação'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!lib) return <div className="p-8 text-center text-red-500">Liberação não encontrada</div>;

  const diasParaDeadline = lib.diasParaDeadline;
  const urgencia = lib.status === 'CONCLUIDA' || lib.status === 'CANCELADA'
    ? 'OK'
    : diasParaDeadline < 0 ? 'VENCIDO' : diasParaDeadline === 0 ? 'HOJE' :
    diasParaDeadline <= 1 ? 'CRITICO' : diasParaDeadline <= 3 ? 'ALERTA' :
    diasParaDeadline <= 7 ? 'MONITORAR' : 'OK';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{lib.instrucao}</h1>
            <UrgenciaBadge nivel={urgencia} />
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {lib.clienteNome ?? lib.cliente?.nome} · {lib.filialNome ?? lib.origem?.nome} → {lib.destinoNome ?? lib.destino?.nome} · {lib.origemNome ?? lib.terminal?.nome}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOcultarValores((o) => !o)}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            title={ocultarValores ? 'Mostrar valores de frete' : 'Ocultar valores de frete antes de enviar print'}
          >
            {ocultarValores ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            {ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
          {podeEditarLiberacao && (
            <Link to={`/liberacoes/${id}/editar`}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <PencilSquareIcon className="w-4 h-4" />
              Editar
            </Link>
          )}
          <button
            onClick={() => setConfirmDelete({ type: 'liberacao' })}
            className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">
            <TrashIcon className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Fardos', value: lib.totalFardos },
          { label: 'Carregado', value: lib.carregado },
          {
            label: 'Saldo Pendente',
            value: <span className={lib.saldo > 0 ? 'text-orange-600 font-bold' : 'text-green-600'}>{lib.saldo}</span>
          },
          {
            label: 'Deadline',
            value: <><span>{formatDate(lib.deadline)}</span><span className="ml-2 text-xs">({diasParaDeadline}d)</span></>
          },
          { label: 'Frete Empresa', value: ocultarValores ? 'R$ ••••••' : formatMoney(lib.freteEmpresa) },
          { label: 'Local de Coleta', value: lib.localColetaNome ?? lib.localColeta?.nome },
          { label: 'Tipo de Fardo', value: lib.tipoFardo },
          {
            label: 'Status',
            value: (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                lib.status === 'ATIVA' ? 'bg-green-100 text-green-700'
                : lib.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
              }`}>{lib.status}</span>
            )
          },
        ].map((c) => (
          <div key={c.label} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{c.label}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {lib.observacao && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">⚠</span>
          <div><strong>Observação:</strong> {lib.observacao}</div>
        </div>
      )}

      {/* Veículos */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Veículos</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lib.veiculos?.length ?? 0} veículo(s) vinculado(s)</p>
          </div>
          <button onClick={() => setVeiculoModal('novo')}
            className="flex items-center gap-2 bg-ui-primary text-white px-3 py-1.5 rounded-lg text-sm hover:bg-ui-primary-hover transition-colors font-medium">
            <PlusIcon className="w-4 h-4" />
            Adicionar Veículo
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {(lib.veiculos ?? []).length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum veículo vinculado. Clique em "Adicionar Veículo" para começar.
            </div>
          )}
          {(lib.veiculos ?? []).map((v: any) => (
            <div key={v.id} className="hover:bg-gray-50 transition-colors">
              {/* Veículo row */}
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
                {/* Placa + modelo */}
                <div className="min-w-[110px]">
                  <p className="font-mono font-bold text-gray-900 text-base tracking-wider">{v.placa}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{v.modeloCarreta?.nomeDescricao}</p>
                </div>

                {/* Motorista */}
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-semibold text-gray-800">{v.motoristaNome}</p>
                  <a
                    href={`https://wa.me/55${v.motoristaTelefone?.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-0.5 w-fit"
                  >
                    <PhoneIcon className="w-3 h-3" />
                    {formatTelefone(v.motoristaTelefone)}
                  </a>
                </div>

                {/* Rastreamento + Isca */}
                <div className="min-w-[130px]">
                  <p className="text-[10px] text-gray-500">Rastreamento</p>
                  <p className="text-xs font-semibold text-gray-800">{RASTREAMENTO_LABELS[v.statusRastreamento as keyof typeof RASTREAMENTO_LABELS] ?? v.statusRastreamento}</p>
                  <p className="text-xs mt-0.5">
                    {v.numeroIsca
                      ? <span>🟢 <span className="font-mono text-gray-700">{v.numeroIsca}</span></span>
                      : <span>🔴 <span className="text-gray-400">Isca não informada</span></span>
                    }
                  </p>
                </div>

                {/* SM - Monitoramento do Veículo */}
                <div className="min-w-[120px]">
                  <label className="block text-[10px] text-gray-500 mb-1">SM (Monitoramento)</label>
                  <select
                    value={v.statusSm}
                    onChange={(e) => {
                      setSavingSmId(v.id);
                      atualizarSmVeiculo.mutate({ veiculoId: v.id, statusSm: e.target.value });
                    }}
                    disabled={savingSmId === v.id}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                  >
                    {SM_OPTIONS.map((sm) => (
                      <option key={sm} value={sm}>{SM_LABELS[sm]}</option>
                    ))}
                  </select>
                </div>

                {/* Fardos + Frete */}
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{v.qtdFardos} fardos</p>
                  <p className="text-xs text-gray-400">{ocultarValores ? 'R$ ••••••' : formatMoney(v.freteMotorista)}</p>
                </div>

                {/* Status update */}
                <div className="min-w-[140px]">
                  <label className="block text-[10px] text-gray-500 mb-1">Status do veículo</label>
                  <select
                    value={v.status}
                    onChange={(e) => {
                      setSavingStatusId(v.id);
                      atualizarStatusVeiculo.mutate({ veiculoId: v.id, status: e.target.value });
                    }}
                    disabled={savingStatusId === v.id}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status}
                        value={status}
                        className={STATUS_SEM_MONITORAMENTO.includes(status) ? 'text-gray-500' : 'text-gray-900'}
                      >
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  {v.ultimaAlteracao && (
                    <p
                      className="mt-1 flex items-center gap-1 text-[10px] text-gray-400"
                      title={`${ACAO_LABELS[v.ultimaAlteracao.acao as keyof typeof ACAO_LABELS]?.label ?? ''}: ${v.ultimaAlteracao.campos.map(labelCampo).join(', ')}`}
                    >
                      <ClockIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {v.ultimaAlteracao.usuario?.nome} · {formatDateTime(v.ultimaAlteracao.em)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setExpandedTimeline(expandedTimeline === v.id ? null : v.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors font-medium"
                    title="Ver timeline"
                  >
                    Timeline
                    {expandedTimeline === v.id
                      ? <ChevronUpIcon className="w-3.5 h-3.5" />
                      : <ChevronDownIcon className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => setVeiculoModal(v.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'veiculo', id: v.id })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Timeline Expandida */}
              {expandedTimeline === v.id && (
                <div className="px-5 pb-5 pt-2 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Progresso · Veículo {v.placa}
                  </p>
                  <TimelineStatus
                    status={v.status}
                    dataAgendamento={v.dataAgendamento}
                    dataCarregamento={v.dataCarregamento}
                    dataDescarga={v.dataDescarga}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de alterações (auditoria) */}
      {podeVerHistorico && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoricoAberto((a) => !a)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div>
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                Histórico de alterações
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Quem alterou a liberação e os veículos, e quando</p>
            </div>
            {historicoAberto ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
          </button>
          {historicoAberto && (
            <div className="border-t divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {carregandoHistorico && <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>}
              {!carregandoHistorico && (historico ?? []).length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">Nenhuma alteração registrada ainda.</div>
              )}
              {(historico ?? []).map((h) => (
                <div key={h.id} className="px-5 py-3 flex gap-4 flex-wrap sm:flex-nowrap">
                  <div className="min-w-[150px]">
                    <p className="text-sm font-semibold text-gray-800">{h.usuario?.nome}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(h.createdAt)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACAO_LABELS[h.acao].className}`}>
                        {ACAO_LABELS[h.acao].label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {labelTabela(h.tabelaAfetada)}
                        {h.descricao && <span className="font-mono font-semibold text-gray-700"> {h.descricao}</span>}
                      </span>
                    </div>
                    <AlteracoesDetalhe registro={h} ocultarValores={ocultarValores} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Veículo */}
      {veiculoModal !== null && (
        <VeiculoModal
          liberacaoId={lib.id}
          veiculoId={typeof veiculoModal === 'number' ? veiculoModal : undefined}
          onClose={() => setVeiculoModal(null)}
          onSaved={() => {
            setVeiculoModal(null);
            qc.invalidateQueries({ queryKey: ['liberacao', id] });
          }}
        />
      )}

      {/* Modal Confirmação - Veículo */}
      <ConfirmModal
        isOpen={confirmDelete?.type === 'veiculo'}
        title="Remover Veículo"
        message="Esta ação irá remover permanentemente o veículo desta liberação. Todos os dados de agendamento e carregamento associados serão perdidos. Deseja continuar?"
        confirmLabel="Sim, remover"
        variant="danger"
        loading={deletarVeiculo.isPending}
        onConfirm={() => confirmDelete?.id && deletarVeiculo.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Modal Confirmação - Liberação */}
      <ConfirmModal
        isOpen={confirmDelete?.type === 'liberacao'}
        title="Excluir Liberação"
        message={`Você está prestes a excluir permanentemente a liberação "${lib.instrucao}". Todos os veículos vinculados também serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        variant="danger"
        loading={deletarLiberacao.isPending}
        onConfirm={() => deletarLiberacao.mutate()}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
