import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_SEM_MONITORAMENTO } from '@/utils/status';

interface Props {
  liberacaoId: number;
  veiculoId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function VeiculoModal({ liberacaoId, veiculoId, onClose, onSaved }: Props) {
  const isEdit = !!veiculoId;
  const [form, setForm] = useState<any>({
    liberacaoId, placa: '', modeloCarretaId: '', nomeDescricao: '',
    freteMotorista: '', qtdFardos: '',
    motoristaNome: '', motoristaTelefone: '', motoristaCpf: '',
    status: 'AGENDADO', observacao: '',
  });

  const { data: veiculoData } = useQuery({
    queryKey: ['veiculo', veiculoId],
    queryFn: () => api.get(`/veiculos/${veiculoId}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (veiculoData) setForm({
      ...veiculoData,
      modeloCarretaId: veiculoData.modeloCarretaId,
      nomeDescricao: veiculoData.modeloCarreta?.nomeDescricao ?? '',
    });
  }, [veiculoData]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.put(`/veiculos/${veiculoId}`, data) : api.post('/veiculos', data),
    onSuccess: () => { toast.success(isEdit ? 'Veículo atualizado' : 'Veículo adicionado'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao salvar'),
  });

  function set(field: string, val: any) {
    setForm((f: any) => ({ ...f, [field]: val }));
  }

  function handleSave() {
    if (!form.nomeDescricao?.trim()) {
      toast.error('Informe o modelo da carreta');
      return;
    }

    const payload = {
      ...form,
      motoristaTelefone: form.motoristaTelefone?.replace(/\D/g, ''),
      // null permite remover um CPF incorreto já gravado.
      motoristaCpf: form.motoristaCpf?.replace(/\D/g, '') || null,
    };

    mutation.mutate(payload);
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
          <Field label="Modelo de Carreta*" value={form.nomeDescricao} onChange={(v: string) => set('nomeDescricao', v)} />
          <Field label="Qtde Fardos*" type="number" value={form.qtdFardos} onChange={(v: string) => set('qtdFardos', parseInt(v))} />
          <Field label="Frete Motorista (R$)*" type="number" value={form.freteMotorista} onChange={(v: string) => set('freteMotorista', parseFloat(v))} />
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
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60">
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, onBlur, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
    </div>
  );
}
