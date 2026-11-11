import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, formatMoney, formatPeso, formatTelefone } from '@/utils/format';
import { STATUS_OPTIONS, STATUS_LABELS, SM_OPTIONS, SM_LABELS, SITUACAO_LABELS, STATUS_LIBERACAO_CLASSES, SituacaoLiberacao } from '@/utils/status';
import UrgenciaBadge from '@/components/UrgenciaBadge';
import ConfirmModal from '@/components/ConfirmModal';
import TimelineStatus from '@/components/TimelineStatus';
import { PlusIcon, PencilSquareIcon, TrashIcon, PhoneIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon, ClockIcon, ArrowLeftIcon, ExclamationTriangleIcon, CheckCircleIcon, PauseCircleIcon, PlayCircleIcon, ArrowPathIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import VeiculoModal from './VeiculoModal';
import EtapasVeiculo from '@/components/EtapasVeiculo';
import { useThemeStore } from '@/stores/theme.store';
import InformeModal, { LinhaInforme } from './Informe';
import { CargaRapida, FormaPagamentoRapida, RastreamentoIscaRapido } from './EdicaoRapida';
import { urlListaLiberacoes } from './navegacao';
import { useAuthStore } from '@/stores/auth.store';
import AlteracoesDetalhe from '@/components/AlteracoesDetalhe';
import { ACAO_LABELS, RegistroAuditoria, labelCampo, labelTabela } from '@/utils/auditoria';

export default function LiberacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const perfil = useAuthStore((s) => s.user?.perfil);
  const podeEditarLiberacao = perfil !== 'OPERADOR';
  const podeVerHistorico = perfil !== 'CLIENTE';
  const isAdmin = perfil === 'ADMIN';
  // Estilos novos trocam o select de status pela trilha de etapas clicável.
  const trilhaEtapas = useThemeStore((s) => s.estilo) !== 'CLASSICO';
  const podeSuspender = perfil === 'ADMIN' || perfil === 'GESTOR_FILIAL';
  const podeInativarVeiculo = perfil === 'ADMIN' || perfil === 'OPERADOR' || perfil === 'GESTOR_FILIAL';
  // Suspender (motivo obrigatório) / reativar a liberação.
  const [suspensao, setSuspensao] = useState<{ motivo: string } | null>(null);
  // Inativar (excluir) / reativar veículo — sempre com motivo.
  const [inativacao, setInativacao] = useState<{ veiculo: any; acao: 'inativar' | 'reativar'; motivo: string } | null>(null);
  // Pop-up de pendência de fechamento — todos os veículos finalizados, mas com dado faltando.
  const [avisoFechamento, setAvisoFechamento] = useState(false);
  const [motivoFechamento, setMotivoFechamento] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const navigate = useNavigate();
  const [veiculoModal, setVeiculoModal] = useState<'novo' | number | null>(null);
  const [informe, setInforme] = useState<number | null>(null);
  const location = useLocation();
  const [expandedTimeline, setExpandedTimeline] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'liberacao' } | null>(null);
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

  // Formas de pagamento e nomes de captação (edição rápida e Informe).
  const { data: referencias } = useQuery({
    queryKey: ['liberacoes-referencias'],
    queryFn: () => api.get('/liberacoes/referencias/lista').then((r) => r.data),
  });

  // Edição rápida na linha do veículo: grava só os campos alterados.
  const editarVeiculo = useMutation({
    mutationFn: ({ veiculoId, campos }: { veiculoId: number; campos: Record<string, unknown> }) => api.put(`/veiculos/${veiculoId}`, campos),
    onSuccess: () => {
      toast.success('Veículo atualizado');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      qc.invalidateQueries({ queryKey: ['liberacoes-referencias'] });
    },
    onError: (err: any) => {
      const e = err?.response?.data?.error;
      toast.error(e?.details?.[0]?.message ?? e?.message ?? 'Erro ao atualizar o veículo');
    },
  });
  const salvarVeiculo = (veiculoId: number) => (campos: Record<string, unknown>) => editarVeiculo.mutateAsync({ veiculoId, campos });

  // Link com #veiculo-ID (placa clicada na lista): rola até o veículo e destaca.
  const [veiculoDestacado, setVeiculoDestacado] = useState<number | null>(null);
  useEffect(() => {
    const m = location.hash.match(/^#veiculo-(\d+)$/);
    if (!m || !lib) return;
    const alvo = document.getElementById(`veiculo-${m[1]}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setVeiculoDestacado(Number(m[1]));
    const t = setTimeout(() => setVeiculoDestacado(null), 2500);
    return () => clearTimeout(t);
  }, [location.hash, lib]);

  // Abre o pop-up ao entrar na liberação nessa situação e sempre que ela passar
  // a valer (ex: acabou de finalizar o último veículo).
  const aguardandoAnterior = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lib === undefined) return;
    if (lib.aguardandoFechamento && !aguardandoAnterior.current) setAvisoFechamento(true);
    aguardandoAnterior.current = lib.aguardandoFechamento;
  }, [lib]);

  const finalizarManual = useMutation({
    mutationFn: () => api.post(`/liberacoes/${id}/finalizar`, { motivo: motivoFechamento.trim() }),
    onSuccess: () => {
      toast.success('Instrução finalizada manualmente');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      setAvisoFechamento(false);
      setMotivoFechamento('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Erro ao finalizar a instrução'),
  });

  const inativarVeiculo = useMutation({
    mutationFn: ({ vid, acao, motivo }: { vid: number; acao: 'inativar' | 'reativar'; motivo: string }) =>
      acao === 'inativar'
        ? api.delete(`/veiculos/${vid}`, { data: { motivo } })
        : api.post(`/veiculos/${vid}/reativar`, { motivo }),
    onSuccess: (_r, { acao }) => {
      toast.success(acao === 'inativar' ? 'Veículo inativado' : 'Veículo reativado');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      setInativacao(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Erro ao alterar o veículo'),
  });

  const suspenderLiberacao = useMutation({
    mutationFn: (motivo?: string) =>
      motivo ? api.post(`/liberacoes/${id}/suspender`, { motivo }) : api.post(`/liberacoes/${id}/reativar`),
    onSuccess: (_r, motivo) => {
      toast.success(motivo ? 'Liberação suspensa' : 'Liberação reativada');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      setSuspensao(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Erro ao alterar a liberação'),
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

  const [salvandoAgendamentoId, setSalvandoAgendamentoId] = useState<number | null>(null);

  const atualizarAgendamentoVeiculo = useMutation({
    mutationFn: ({ veiculoId, dataAgendamento }: { veiculoId: number; dataAgendamento: string | null }) =>
      api.put(`/veiculos/${veiculoId}`, { dataAgendamento }),
    onSuccess: () => {
      toast.success('Agendamento do veículo atualizado');
      qc.invalidateQueries({ queryKey: ['liberacao', id] });
      setSalvandoAgendamentoId(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar agendamento do veículo');
      setSalvandoAgendamentoId(null);
    },
  });

  const deletarLiberacao = useMutation({
    mutationFn: () => api.delete(`/liberacoes/${id}`),
    onSuccess: () => {
      toast.success('Liberação removida com sucesso');
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      navigate(urlListaLiberacoes());
    },
    onError: () => toast.error('Erro ao remover liberação'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (!lib) return <div className="p-8 text-center text-red-500">Liberação não encontrada</div>;

  const diasParaDeadline = lib.diasParaDeadline;
  const toneladas: number = lib.toneladasCarregadas ?? 0;
  // Deadline é de carregamento: tudo carregado = no prazo, mesmo com a data passada.
  const urgencia = lib.status !== 'ATIVA' || lib.prazoCumprido
    ? 'OK'
    : diasParaDeadline < 0 ? 'VENCIDO' : diasParaDeadline === 0 ? 'HOJE' :
    diasParaDeadline <= 1 ? 'CRITICO' : diasParaDeadline <= 3 ? 'ALERTA' :
    diasParaDeadline <= 7 ? 'MONITORAR' : 'OK';

  return (
    <div className="p-6 space-y-6">
      <Link
        to={urlListaLiberacoes()}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Voltar para Liberações
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{lib.instrucao}</h1>
            <UrgenciaBadge nivel={urgencia} />
            <SituacaoBadge situacao={lib.situacao} pendencias={lib.pendencias?.length} />
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
          {podeSuspender && lib.status === 'ATIVA' && (
            <button onClick={() => setSuspensao({ motivo: '' })}
              className="flex items-center gap-2 border border-amber-300 text-amber-700 px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition-colors">
              <PauseCircleIcon className="w-4 h-4" />
              Suspender
            </button>
          )}
          {podeSuspender && lib.status === 'SUSPENSA' && (
            <button onClick={() => suspenderLiberacao.mutate(undefined)} disabled={suspenderLiberacao.isPending}
              className="flex items-center gap-2 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition-colors disabled:opacity-60">
              <PlayCircleIcon className="w-4 h-4" />
              Reativar
            </button>
          )}
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
          {
            label: 'Total de Fardos',
            value: <>{lib.totalFardos}{lib.pesoTotal != null && <span className="ml-2 text-xs text-gray-500">{formatPeso(lib.pesoTotal)}</span>}</>,
          },
          {
            label: 'Programado',
            hint: 'Fardos com caminhão (veículos ativos, qualquer etapa)',
            value: <>{lib.programado}</>,
          },
          {
            label: 'Carregado',
            hint: 'Fardos de veículos a partir de MANIFESTADO',
            value: <>{lib.carregado}{toneladas > 0 && <span className="ml-2 text-xs text-gray-500">{formatPeso(toneladas)}</span>}</>
          },
          {
            label: 'Saldo',
            value: (
              <span className="block space-y-0.5">
                <span className={`block ${lib.saldo > 0 ? 'text-orange-600 font-bold' : 'text-green-600'}`}>
                  {lib.saldo} a programar
                  {lib.saldo > 0 && lib.pesoMedioFardoKg != null && (
                    <span className="ml-1 text-xs font-normal text-gray-500">~{formatPeso((lib.saldo * lib.pesoMedioFardoKg) / 1000)}</span>
                  )}
                </span>
                <span className={`block text-xs ${lib.saldoCarregar > 0 ? 'text-orange-600' : 'text-green-600'}`}>{lib.saldoCarregar} a carregar</span>
              </span>
            ),
          },
          {
            label: 'Deadline (carregamento)',
            value: <><span>{formatDate(lib.deadline)}</span><span className="ml-2 text-xs">{lib.prazoCumprido ? '(tudo carregado)' : `(${diasParaDeadline}d)`}</span></>
          },
          {
            label: 'Frete (R$/t)',
            value: ocultarValores ? 'R$ ••••••' : (
              <span className="block space-y-0.5">
                <span className="block">Empresa {formatMoney(lib.freteEmpresa)}</span>
                <span className="block">Motorista {lib.freteMotorista != null ? formatMoney(lib.freteMotorista) : '—'}</span>
                {lib.freteMotorista != null && lib.freteEmpresa > 0 && (
                  <span className="block text-xs text-gray-500" title="(frete empresa − frete motorista) ÷ frete empresa">
                    Margem {(((lib.freteEmpresa - lib.freteMotorista) / lib.freteEmpresa) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                )}
              </span>
            ),
          },
          { label: 'Local de Coleta', value: lib.localColetaNome ?? lib.localColeta?.nome },
          { label: 'Local de Entrega', value: lib.localEntregaNome ?? lib.localEntrega?.nome ?? '—' },
          {
            label: 'Tipo de Fardo',
            value: (
              <span className="block space-y-0.5">
                <span className="block">{lib.tipoFardo === 'FARDAO' ? 'FARDÃO' : lib.tipoFardo}</span>
                {lib.pesoMedioFardoKg != null && <span className="block text-xs font-normal text-gray-500">médio {Math.round(lib.pesoMedioFardoKg).toLocaleString('pt-BR')} kg/fardo</span>}
                {lib.pesoMedioRealKg != null && <span className="block text-xs font-normal text-gray-500">real {Math.round(lib.pesoMedioRealKg).toLocaleString('pt-BR')} kg/fardo</span>}
                {lib.pesoTotal == null && lib.status === 'ATIVA' && <span className="block text-xs font-normal text-amber-600">peso da instrução não informado</span>}
              </span>
            ),
          },
          {
            label: 'Status',
            value: (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                lib.status === 'CONCLUIDA' && lib.fechamentoManual ? 'bg-amber-100 text-amber-700' : STATUS_LIBERACAO_CLASSES[lib.status] ?? 'bg-gray-100 text-gray-500'
              }`}>{lib.status}{lib.status === 'CONCLUIDA' && lib.fechamentoManual ? ' (MANUAL)' : ''}</span>
            )
          },
        ].map((c: { label: string; value: React.ReactNode; hint?: string }) => (
          <div key={c.label} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow" title={c.hint}>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{c.label}</p>
            <div className="text-sm font-semibold text-gray-800 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {lib.status === 'SUSPENSA' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
          <PauseCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Liberação suspensa.</strong> Não gera alertas e fica fora dos indicadores de risco.
            {(lib.suspensaPor || lib.suspensaEm) && <span> Por {lib.suspensaPor ?? '—'} em {formatDateTime(lib.suspensaEm)}.</span>}
            {lib.motivoSuspensao && <p className="mt-1"><strong>Motivo:</strong> {lib.motivoSuspensao}</p>}
          </div>
        </div>
      )}

      {lib.aguardandoFechamento && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3 flex-wrap">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-[220px]">
            <strong>Pendência de dados para concluir ({lib.pendencias.length}).</strong> Todos os veículos estão finalizados, mas a
            instrução só conclui com os dados completos{isAdmin ? '. Corrija os dados ou finalize mesmo assim.' : ' — ou um administrador finaliza.'}
            <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs">
              {lib.pendencias.map((p: string) => <li key={p}>{p}</li>)}
            </ul>
          </div>
          {isAdmin && (
            <button
              onClick={() => setAvisoFechamento(true)}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Finalizar instrução
            </button>
          )}
        </div>
      )}

      {lib.status === 'CONCLUIDA' && lib.fechamentoManual && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Fechada manualmente{lib.fardosPendentesFechamento ? ` com ${lib.fardosPendentesFechamento} fardos pendentes` : ' com pendência de dados'}.</strong>
            {(lib.fechamentoManualPor || lib.fechamentoManualEm) && (
              <span> Por {lib.fechamentoManualPor ?? '—'} em {formatDateTime(lib.fechamentoManualEm)}.</span>
            )}
            {lib.motivoFechamento && <p className="mt-1"><strong>Motivo:</strong> {lib.motivoFechamento}</p>}
            {lib.pendenciasFechamento && (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {lib.pendenciasFechamento.split('\n').map((p: string) => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

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
            <p className="text-xs text-gray-400 mt-0.5">
              {(lib.veiculos ?? []).filter((v: any) => v.ativo).length} veículo(s) ativo(s)
              {(lib.veiculos ?? []).some((v: any) => !v.ativo) && ` · ${(lib.veiculos ?? []).filter((v: any) => !v.ativo).length} inativo(s)`}
            </p>
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
          {(lib.veiculos ?? []).map((v: any) => {
            const inativo = !v.ativo;
            // Finalizado com dado faltando: borda amarela + lista do que falta.
            const comPendencia = !inativo && v.status === 'FINALIZADO' && v.pendencias?.length > 0;
            return (
            <div key={v.id} id={`veiculo-${v.id}`} className={`transition-colors ${veiculoDestacado === v.id ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/50' : ''} ${inativo ? 'bg-gray-50' : comPendencia ? 'bg-amber-50/60 border-l-4 border-amber-400' : 'hover:bg-gray-50'}`}>
              {inativo && (
                <div className="px-5 pt-3 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 font-bold text-gray-600"><NoSymbolIcon className="w-3 h-3" />INATIVO</span>
                  <span><strong>Motivo:</strong> {v.motivoInativacao ?? '—'}</span>
                  {(v.inativadoPor || v.inativadoEm) && <span>· {v.inativadoPor ?? '—'} em {formatDateTime(v.inativadoEm)}</span>}
                  {isAdmin && (
                    <button onClick={() => setInativacao({ veiculo: v, acao: 'reativar', motivo: '' })}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-green-300 px-2 py-1 font-semibold text-green-700 hover:bg-green-50">
                      <ArrowPathIcon className="w-3.5 h-3.5" />Reativar
                    </button>
                  )}
                </div>
              )}
              {comPendencia && (
                <p className="px-5 pt-3 text-xs text-amber-700"><ExclamationTriangleIcon className="inline w-3.5 h-3.5 mr-1" />Falta: {v.pendencias.join(' · ')}</p>
              )}
              {/* Veículo row — inativo fica apagado e bloqueado */}
              <fieldset disabled={inativo} className={`px-5 py-4 flex items-center gap-4 flex-wrap ${inativo ? 'opacity-50 line-through decoration-gray-400' : ''}`}>
                {/* Placa + modelo */}
                <div className="min-w-[110px]">
                  <p className="font-mono font-bold text-gray-900 text-base tracking-wider">{v.placa}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{v.modeloCarreta?.nomeDescricao}</p>
                  <FormaPagamentoRapida v={v} opcoes={referencias?.formasPagamento ?? []} salvar={salvarVeiculo(v.id)} desabilitado={inativo} />
                  <div className="mt-1 flex items-center gap-2">
                    <button type="button" onClick={() => setInforme(v.id)}
                      className="rounded border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50">
                      Informe
                    </button>
                  </div>
                  <LinhaInforme v={v} />
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

                {/* Rastreamento + Isca — clique altera */}
                <RastreamentoIscaRapido v={v} salvar={salvarVeiculo(v.id)} desabilitado={inativo} />

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

                {/* Agendamento (data + hora) */}
                <AgendamentoVeiculo
                  key={`${v.id}-${v.dataAgendamento ?? ''}`}
                  dataAgendamento={v.dataAgendamento}
                  salvando={salvandoAgendamentoId === v.id}
                  onSalvar={(dataAgendamento) => {
                    setSalvandoAgendamentoId(v.id);
                    atualizarAgendamentoVeiculo.mutate({ veiculoId: v.id, dataAgendamento });
                  }}
                />

                {/* Fardos + Peso + Frete — clique altera */}
                <CargaRapida v={v} salvar={salvarVeiculo(v.id)} desabilitado={inativo} ocultarValores={ocultarValores} pesoMedioFardoKg={lib.pesoMedioFardoKg} />

                {/* Status update */}
                <div className="min-w-[140px]">
                  <label className="block text-[10px] text-gray-500 mb-1">{trilhaEtapas ? 'Última alteração' : 'Status do veículo'}</label>
                  {!trilhaEtapas && <select
                    value={v.status}
                    onChange={(e) => {
                      setSavingStatusId(v.id);
                      atualizarStatusVeiculo.mutate({ veiculoId: v.id, status: e.target.value });
                    }}
                    disabled={savingStatusId === v.id}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                  >
                    {STATUS_OPTIONS.map((status, i) => (
                      <option key={status} value={status}>{i + 1}. {STATUS_LABELS[status]}</option>
                    ))}
                  </select>}
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
                  {podeInativarVeiculo && (
                    <button
                      onClick={() => setInativacao({ veiculo: v, acao: 'inativar', motivo: '' })}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir (inativar)"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Trilha de etapas clicável (estilos novos): clique → confirma → muda o status */}
                {trilhaEtapas && (
                  <div className="basis-full pt-1">
                    <EtapasVeiculo status={v.status} desabilitado={inativo} salvando={savingStatusId === v.id}
                      onMudar={(status) => { setSavingStatusId(v.id); atualizarStatusVeiculo.mutate({ veiculoId: v.id, status }); }} />
                  </div>
                )}
              </fieldset>

              {/* Timeline Expandida */}
              {expandedTimeline === v.id && (
                <div className="px-5 pb-5 pt-2 bg-ui-surface border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Progresso · Veículo {v.placa}
                  </p>
                  <TimelineStatus
                    status={v.status}
                    ativo={v.ativo}
                    dataAgendamento={v.dataAgendamento}
                    dataCarregamento={v.dataCarregamento}
                    dataDescarga={v.dataDescarga}
                  />
                </div>
              )}
            </div>
            );
          })}
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

      {/* Informe: ordem do caminhão para o WhatsApp */}
      {informe !== null && (() => {
        const ativos = (lib.veiculos ?? []).filter((x: any) => x.ativo);
        const v = (lib.veiculos ?? []).find((x: any) => x.id === informe);
        if (!v) return null;
        return (
          <InformeModal v={v} lib={lib} posicao={Math.max(1, ativos.findIndex((x: any) => x.id === v.id) + 1)}
            captacoes={referencias?.captacoes ?? []} salvar={salvarVeiculo(v.id)} onClose={() => setInforme(null)} />
        );
      })()}

      {/* Modal Veículo */}
      {veiculoModal !== null && (
        <VeiculoModal
          liberacaoId={lib.id}
          veiculoId={typeof veiculoModal === 'number' ? veiculoModal : undefined}
          freteMotoristaPadrao={lib.freteMotorista}
          onClose={() => setVeiculoModal(null)}
          onSaved={() => {
            setVeiculoModal(null);
            qc.invalidateQueries({ queryKey: ['liberacao', id] });
          }}
        />
      )}

      {/* Pop-up: veículos finalizados com fardos pendentes */}
      <ConfirmModal
        isOpen={avisoFechamento && !!lib.aguardandoFechamento}
        title={`Pendência de dados (${lib.pendencias?.length ?? 0})`}
        message={isAdmin
          ? 'Todos os veículos estão finalizados, mas faltam dados para concluir (lista na faixa amarela). Corrija os dados ou finalize mesmo assim — ela ficará marcada em amarelo como "fechada manualmente", com o que faltava e o motivo.'
          : 'Todos os veículos estão finalizados, mas faltam dados para concluir (lista na faixa amarela). A instrução continua ativa até os dados serem corrigidos ou um administrador finalizá-la.'}
        variant="warning"
        confirmLabel={isAdmin ? 'Finalizar instrução' : 'Entendi'}
        cancelLabel="Agora não"
        hideCancel={!isAdmin}
        loading={finalizarManual.isPending}
        onConfirm={() => {
          if (!isAdmin) return setAvisoFechamento(false);
          if (motivoFechamento.trim().length < 3) return toast.error('Informe o motivo do fechamento');
          finalizarManual.mutate();
        }}
        onCancel={() => setAvisoFechamento(false)}
      >
        {isAdmin && (
          <textarea
            value={motivoFechamento}
            onChange={(e) => setMotivoFechamento(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Motivo do fechamento (obrigatório)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
          />
        )}
      </ConfirmModal>

      {/* Inativar (excluir) / reativar veículo — motivo obrigatório */}
      <ConfirmModal
        isOpen={!!inativacao}
        title={inativacao?.acao === 'reativar' ? `Reativar veículo ${inativacao?.veiculo.placa}` : `Excluir veículo ${inativacao?.veiculo.placa ?? ''}`}
        message={inativacao?.acao === 'reativar'
          ? 'O veículo volta a contar em programado, carregado, saldo e relatórios, e pode ser editado de novo.'
          : 'O veículo não é apagado: fica inativo na lista (bloqueado para edição) e deixa de contar em programado, carregado, saldo, frete e relatórios. Só um administrador pode reativar.'}
        confirmLabel={inativacao?.acao === 'reativar' ? 'Reativar' : 'Inativar veículo'}
        variant={inativacao?.acao === 'reativar' ? 'info' : 'danger'}
        loading={inativarVeiculo.isPending}
        onConfirm={() => {
          if (!inativacao) return;
          if (inativacao.motivo.trim().length < 3) return toast.error('Informe o motivo');
          inativarVeiculo.mutate({ vid: inativacao.veiculo.id, acao: inativacao.acao, motivo: inativacao.motivo.trim() });
        }}
        onCancel={() => setInativacao(null)}
      >
        {inativacao?.acao === 'inativar' && (
          <div className="mb-2 flex flex-wrap gap-1">
            {['Motorista desistiu', 'Lançado errado', 'Trocou de caminhão'].map((m) => (
              <button key={m} type="button" onClick={() => setInativacao((x) => x && { ...x, motivo: m })}
                className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100">{m}</button>
            ))}
          </div>
        )}
        <textarea
          value={inativacao?.motivo ?? ''}
          onChange={(e) => setInativacao((x) => x && { ...x, motivo: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Motivo (obrigatório)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
        />
      </ConfirmModal>

      {/* Suspender liberação — motivo obrigatório */}
      <ConfirmModal
        isOpen={!!suspensao}
        title="Suspender liberação"
        message="A liberação suspensa não gera alertas, sai dos indicadores de risco e aparece em amarelo na lista. Os veículos continuam podendo ser movimentados. Dá para reativar depois."
        confirmLabel="Suspender"
        variant="warning"
        loading={suspenderLiberacao.isPending}
        onConfirm={() => {
          if (!suspensao || suspensao.motivo.trim().length < 3) return toast.error('Informe o motivo da suspensão');
          suspenderLiberacao.mutate(suspensao.motivo.trim());
        }}
        onCancel={() => setSuspensao(null)}
      >
        <textarea
          value={suspensao?.motivo ?? ''}
          onChange={(e) => setSuspensao({ motivo: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Motivo da suspensão (obrigatório)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800"
        />
      </ConfirmModal>

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

function SituacaoBadge({ situacao, pendencias }: { situacao?: SituacaoLiberacao; pendencias?: number }) {
  if (!situacao) return null;
  const s = SITUACAO_LABELS[situacao];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.className}`}>
      {s.label}{situacao === 'PENDENCIA_DADOS' && pendencias ? ` (${pendencias})` : ''}
    </span>
  );
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

// Data e hora do agendamento, no fuso do navegador (Brasília na operação).
// Salva quando os dois campos estão preenchidos; limpar os dois remove o agendamento.
function AgendamentoVeiculo({ dataAgendamento, salvando, onSalvar }: {
  dataAgendamento?: string | null;
  salvando: boolean;
  onSalvar: (dataAgendamento: string | null) => void;
}) {
  const atual = dataAgendamento ? new Date(dataAgendamento) : null;
  const dataInicial = atual ? `${atual.getFullYear()}-${doisDigitos(atual.getMonth() + 1)}-${doisDigitos(atual.getDate())}` : '';
  const horaInicial = atual ? `${doisDigitos(atual.getHours())}:${doisDigitos(atual.getMinutes())}` : '';
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState(horaInicial);

  function salvar(novaData: string, novaHora: string) {
    if (novaData === dataInicial && novaHora === horaInicial) return;
    if (!novaData && !novaHora) return onSalvar(null);
    if (!novaData || !novaHora) return;
    onSalvar(new Date(`${novaData}T${novaHora}`).toISOString());
  }

  const incompleto = (!!data) !== (!!hora);
  // Clicar em qualquer parte do campo abre o mini calendário / seletor de hora.
  const abrirSeletor = (e: React.MouseEvent<HTMLInputElement>) => {
    try { e.currentTarget.showPicker?.(); } catch { /* navegador sem suporte: segue com o ícone padrão */ }
  };
  return (
    <div className="min-w-[236px]">
      <label className="block text-[10px] text-gray-500 mb-1">Agendamento</label>
      <div className="flex gap-1">
        <input type="date" value={data} disabled={salvando}
          onChange={(e) => setData(e.target.value)} onBlur={() => salvar(data, hora)} onClick={abrirSeletor}
          className={`w-[136px] cursor-pointer border ${incompleto && !data ? 'border-amber-400' : 'border-gray-200'} rounded px-1.5 py-1 text-xs bg-white`} />
        <input type="time" value={hora} disabled={salvando}
          onChange={(e) => setHora(e.target.value)} onBlur={() => salvar(data, hora)} onClick={abrirSeletor}
          className={`w-[96px] cursor-pointer border ${incompleto && !hora ? 'border-amber-400' : 'border-gray-200'} rounded px-1.5 py-1 text-xs bg-white`} />
      </div>
      {incompleto && <p className="mt-1 text-[10px] text-amber-600">Informe data e hora</p>}
    </div>
  );
}
