import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import EscolhaModal from '@/components/EscolhaModal';
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_SEM_MONITORAMENTO, RASTREAMENTO_OPTIONS, RASTREAMENTO_LABELS } from '@/utils/status';

interface Props {
  liberacaoId: number;
  veiculoId?: number;
  // Frete motorista combinado na liberação (R$/t) — sugestão para a nova viagem.
  freteMotoristaPadrao?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

type MotoristaCadastrado = { nome: string; telefone: string; cpf: string | null };

export default function VeiculoModal({ liberacaoId, veiculoId, freteMotoristaPadrao, onClose, onSaved }: Props) {
  const isEdit = !!veiculoId;
  const qc = useQueryClient();
  // Só ADMIN cria modelo de carreta novo; os demais escolhem um existente.
  const isAdmin = useAuthStore((s) => s.user?.perfil) === 'ADMIN';
  // Backend achou motorista parecido (MOTORISTA_EXISTENTE): 1º pergunta se quer
  // usar o cadastrado; se não, se é atualização dos dados dele; se não de novo, grava como novo.
  const [motoristaExistente, setMotoristaExistente] = useState<{ candidatos: MotoristaCadastrado[]; etapa: 'usar' | 'atualizar' } | null>(null);
  const { data: referencias } = useQuery({
    queryKey: ['liberacoes-referencias'],
    queryFn: () => api.get('/liberacoes/referencias/lista').then((r) => r.data),
  });
  const modelos: string[] = referencias?.modelosCarreta ?? [];
  const [form, setForm] = useState<any>({
    liberacaoId, placa: '', modeloCarretaId: '', nomeDescricao: '',
    freteMotorista: freteMotoristaPadrao ?? '', qtdFardos: '', pesoCarregado: '',
    motoristaNome: '', motoristaTelefone: '', motoristaCpf: '',
    status: 'AGENDADO', statusRastreamento: 'NAO_RASTREADO', numeroIsca: '', observacao: '',
  });

  const { data: veiculoData, isFetchedAfterMount } = useQuery({
    queryKey: ['veiculo', veiculoId],
    queryFn: () => api.get(`/veiculos/${veiculoId}`).then((r) => r.data),
    enabled: isEdit,
    // Abre sempre com o dado atual do servidor e não recarrega durante a edição.
    refetchOnMount: 'always',
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Preenche o formulário uma única vez — atualizações posteriores do cache
  // (ex: alteração salva em outra tela) não podem apagar o que está sendo digitado.
  const preenchido = useRef(false);
  useEffect(() => {
    if (!veiculoData || !isFetchedAfterMount || preenchido.current) return;
    preenchido.current = true;
    setForm({
      ...veiculoData,
      modeloCarretaId: veiculoData.modeloCarretaId,
      nomeDescricao: veiculoData.modeloCarreta?.nomeDescricao ?? '',
    });
  }, [veiculoData, isFetchedAfterMount]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.put(`/veiculos/${veiculoId}`, data) : api.post('/veiculos', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Veículo atualizado' : 'Veículo adicionado');
      // sem isso, reabrir o modal mostra o valor antigo em cache até expirar sozinho
      qc.invalidateQueries({ queryKey: ['veiculo'] });
      qc.invalidateQueries({ queryKey: ['liberacoes-referencias'] });
      onSaved();
    },
    onError: (e: any) => {
      const error = e?.response?.data?.error;
      if (error?.code === 'MOTORISTA_EXISTENTE') {
        setMotoristaExistente({ candidatos: error.details.candidatos, etapa: 'usar' });
        return;
      }
      const primeiroDetalhe = error?.details?.[0];
      toast.error(primeiroDetalhe?.message || error?.message || 'Erro ao salvar');
    },
  });

  function set(field: string, val: any) {
    setForm((f: any) => ({ ...f, [field]: val }));
  }

  function handleSave() {
    if (!form.nomeDescricao?.trim()) {
      toast.error('Informe o modelo da carreta');
      return;
    }
    mutation.mutate(montarPayload(form));
  }

  function usarMotorista(m: MotoristaCadastrado) {
    const novoForm = { ...form, motoristaNome: m.nome, motoristaTelefone: m.telefone, motoristaCpf: m.cpf ?? '' };
    setForm(novoForm);
    setMotoristaExistente(null);
    mutation.mutate(montarPayload(novoForm));
  }

  function salvarComDecisao(motoristaDecisao: { acao: 'novo' } | { acao: 'atualizar'; alvo: MotoristaCadastrado }) {
    setMotoristaExistente(null);
    mutation.mutate({ ...montarPayload(form), motoristaDecisao });
  }

  function montarPayload(form: any) {
    return {
      ...(isEdit ? {} : { liberacaoId }),
      placa: form.placa?.trim().toUpperCase(),
      modeloCarretaId: Number.isInteger(form.modeloCarretaId) ? form.modeloCarretaId : undefined,
      nomeDescricao: form.nomeDescricao.trim(),
      qtdFardos: Number(form.qtdFardos),
      freteMotorista: Number(form.freteMotorista),
      pesoCarregado: form.pesoCarregado === '' || form.pesoCarregado == null || Number.isNaN(Number(form.pesoCarregado)) ? null : Number(form.pesoCarregado),
      motoristaNome: form.motoristaNome?.trim(),
      motoristaTelefone: form.motoristaTelefone?.replace(/\D/g, ''),
      // null permite remover um CPF incorreto já gravado.
      motoristaCpf: form.motoristaCpf?.replace(/\D/g, '') || null,
      status: form.status,
      statusRastreamento: form.statusRastreamento,
      numeroIsca: form.numeroIsca?.trim() || null,
      observacao: form.observacao?.trim() || undefined,
    };
  }

  async function buscarDadosPorPlaca() {
    if (!form.placa || form.placa.length < 5 || isEdit) return;
    try {
      const res = await api.get(`/veiculos/placa/${form.placa}`);
      if (res.data) {
        setForm((f: any) => ({
          ...f,
          modeloCarretaId: res.data.modeloCarretaId || f.modeloCarretaId,
          nomeDescricao: res.data.nomeDescricao || f.nomeDescricao,
          motoristaNome: res.data.motoristaNome || f.motoristaNome,
          motoristaTelefone: res.data.motoristaTelefone || f.motoristaTelefone,
          motoristaCpf: res.data.motoristaCpf || f.motoristaCpf,
        }));
        toast.success('Dados do veículo preenchidos automaticamente!', { icon: '🚚' });
      }
    } catch (e) {
      // ignora erro silenciosamente
    }
  }

  async function buscarMotoristaPorCpf() {
    const cpf = form.motoristaCpf?.replace(/\D/g, '');
    if (!cpf || cpf.length < 10) return;
    try {
      const { data } = await api.get(`/veiculos/motorista/cpf/${cpf}`);
      if (data) setForm((f: any) => ({ ...f, motoristaNome: data.motoristaNome, motoristaTelefone: data.motoristaTelefone, motoristaCpf: data.motoristaCpf }));
    } catch { /* CPF ainda não cadastrado */ }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{isEdit ? 'Editar Veículo' : 'Adicionar Veículo'}</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Placa*</label>
            <input type="text" value={form.placa ?? ''} 
              onChange={(e) => set('placa', e.target.value.toUpperCase())} 
              onBlur={buscarDadosPorPlaca}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
          {isAdmin ? (
            <Field label="Modelo de Carreta*" value={form.nomeDescricao} onChange={(v: string) => set('nomeDescricao', v)} suggestions={modelos} />
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Modelo de Carreta*</label>
              <select value={form.nomeDescricao ?? ''} onChange={(e) => set('nomeDescricao', e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                <option value="">Selecione o modelo</option>
                {/* Mantém o valor atual mesmo se ainda não estiver na lista (ex: preenchido pela placa). */}
                {[...new Set([...(form.nomeDescricao ? [form.nomeDescricao] : []), ...modelos])].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <Field label="Qtde Fardos*" type="number" value={form.qtdFardos} onChange={(v: string) => set('qtdFardos', parseInt(v))} />
          <Field label="Peso carregado (t)" type="number" value={form.pesoCarregado} onChange={(v: string) => set('pesoCarregado', v)} placeholder="Ex: 36,5 (NF/balança)" />
          <Field label="Frete Motorista (R$/t)*" type="number" value={form.freteMotorista} onChange={(v: string) => set('freteMotorista', parseFloat(v))} />
          <Field label="Nome do Motorista*" value={form.motoristaNome} onChange={(v: string) => set('motoristaNome', v)} />
          <Field label="Telefone do Motorista*" value={form.motoristaTelefone} onChange={(v: string) => set('motoristaTelefone', v)} placeholder="11999998888" />
          <Field label="CPF Motorista" value={form.motoristaCpf ?? ''} onChange={(v: string) => set('motoristaCpf', v)} onBlur={buscarMotoristaPorCpf} placeholder="Somente números" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className={STATUS_SEM_MONITORAMENTO.includes(s) ? 'text-gray-500' : 'text-gray-900'}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Itens em "Sem Dead Line" mantêm o mesmo estilo, sem alterar a sequência.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status do Rastreamento</label>
            <select value={form.statusRastreamento} onChange={(e) => set('statusRastreamento', e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
              {RASTREAMENTO_OPTIONS.map((r) => (
                <option key={r} value={r}>{RASTREAMENTO_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <Field label="Controle de Isca" value={form.numeroIsca} onChange={(v: string) => set('numeroIsca', v)} placeholder="Número da isca" />
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Observação</label>
            <textarea value={form.observacao ?? ''} onChange={(e) => set('observacao', e.target.value)}
              rows={2} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={mutation.isPending}
            className="px-4 py-2 bg-ui-primary text-white rounded-lg text-sm font-medium hover:bg-ui-primary-hover disabled:opacity-60">
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <EscolhaModal
        isOpen={!!motoristaExistente}
        title={motoristaExistente?.etapa === 'atualizar' ? 'É uma atualização de dados?' : 'Motorista já existe no sistema'}
        loading={mutation.isPending}
        onClose={() => setMotoristaExistente(null)}
        acoes={motoristaExistente?.etapa === 'atualizar'
          ? [{ label: 'Não, cadastrar como novo motorista', variante: 'secundaria', onClick: () => salvarComDecisao({ acao: 'novo' }) }]
          : [{ label: 'Não', variante: 'secundaria', onClick: () => setMotoristaExistente((m) => m && { ...m, etapa: 'atualizar' }) }]}
      >
        {motoristaExistente?.etapa === 'atualizar' ? (
          <p>
            Os dados digitados (<strong>{form.motoristaNome}</strong> · {form.motoristaTelefone}{form.motoristaCpf ? ` · CPF ${form.motoristaCpf}` : ''})
            são uma atualização do cadastro do motorista abaixo? Se sim, todos os veículos dele passam a usar os dados novos.
          </p>
        ) : (
          <p>Já existe motorista parecido com <strong>{form.motoristaNome}</strong> cadastrado no sistema. Deseja usar este cadastro?</p>
        )}
        <div className="mt-3 divide-y rounded-lg border">
          {motoristaExistente?.candidatos.map((m) => (
            <div key={`${m.nome}|${m.telefone}|${m.cpf}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{m.nome}</p>
                <p className="text-xs text-gray-500">Tel. {m.telefone}{m.cpf ? ` · CPF ${m.cpf}` : ' · sem CPF'}</p>
              </div>
              {motoristaExistente.etapa === 'atualizar' ? (
                <button type="button" onClick={() => salvarComDecisao({ acao: 'atualizar', alvo: m })} disabled={mutation.isPending}
                  className="shrink-0 rounded-lg bg-ui-primary px-3 py-1 text-xs font-semibold text-white hover:bg-ui-primary-hover disabled:opacity-50">
                  Sim, atualizar este
                </button>
              ) : (
                <button type="button" onClick={() => usarMotorista(m)} disabled={mutation.isPending}
                  className="shrink-0 rounded-lg bg-ui-primary px-3 py-1 text-xs font-semibold text-white hover:bg-ui-primary-hover disabled:opacity-50">
                  Sim, usar este
                </button>
              )}
            </div>
          ))}
        </div>
      </EscolhaModal>
    </div>
  );
}

function Field({ label, value, onChange, onBlur, type = 'text', placeholder, suggestions }: any) {
  const listId = suggestions ? `sugestoes-${label}` : undefined;
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} list={listId}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
      {suggestions && <datalist id={listId}>{suggestions.map((item: string) => <option key={item} value={item} />)}</datalist>}
    </div>
  );
}
