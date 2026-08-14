import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const modeloSchema = z.object({
  nomeDescricao: z.string().min(1, 'Modelo é obrigatório'),
  motoristaNome: z.string().optional(),
  motoristaTelefone: z.string().optional(),
  placaVeiculo: z.string().optional(),
  capacidadeMaximaFardos: z.coerce.number({ message: 'Deve ser um número' }).int().nonnegative('Não pode ser negativo'),
  pesoMaximoKg: z.coerce.number({ message: 'Deve ser um número' }).int().nonnegative('Não pode ser negativo'),
  comprimentoM: z.coerce.number().optional().or(z.literal('')),
  observacoes: z.string().optional(),
});

type ModeloFormData = z.infer<typeof modeloSchema>;

export default function ModelosPage() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtros, setFiltros] = useState({ nomeModelo: '', nomeMotorista: '', placaVeiculo: '', status: '' });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ModeloFormData>({
    resolver: zodResolver(modeloSchema) as any,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['modelos'],
    queryFn: () => api.get('/modelos').then((r) => r.data),
  });

  const modelos = Array.isArray(response) ? response : response?.data || [];

  const salvar = useMutation({
    mutationFn: (data: ModeloFormData) => editando ? api.put(`/modelos/${editando.id}`, data) : api.post('/modelos', data),
    onSuccess: () => { 
      toast.success(editando ? 'Veículo atualizado!' : 'Veículo criado!'); 
      qc.invalidateQueries({ queryKey: ['modelos'] }); 
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao salvar'),
  });

  const deletar = useMutation({
    mutationFn: (id: number) => api.delete(`/modelos/${id}`),
    onSuccess: () => { toast.success('Removido'); qc.invalidateQueries({ queryKey: ['modelos'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao deletar'),
  });

  const sincronizar = useMutation({
    mutationFn: () => api.post('/modelos/sincronizar-vinculos'),
    onSuccess: (response) => {
      toast.success(`${response.data.atualizados} vínculo(s) sincronizado(s)`);
      qc.invalidateQueries({ queryKey: ['modelos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao sincronizar'),
  });

  function filtrarDados() {
    return (modelos ?? []).filter((m: any) => {
      const matchModelo = m.nomeDescricao.toLowerCase().includes(filtros.nomeModelo.toLowerCase());
      const matchMotorista = m.motoristaNome?.toLowerCase().includes(filtros.nomeMotorista.toLowerCase()) ?? false;
      const matchPlaca = (m.placaVeiculo || '').toLowerCase().includes(filtros.placaVeiculo.toLowerCase());
      const matchStatus = filtros.status ? (filtros.status === 'ativo' ? m.ativo : !m.ativo) : true;
      return matchModelo && matchMotorista && matchPlaca && matchStatus;
    });
  }
  
  function limparFiltros() { setFiltros({ nomeModelo: '', nomeMotorista: '', placaVeiculo: '', status: '' }); }
  
  function openModal(m?: any) {
    if (m) {
      setEditando(m);
      reset({ 
        nomeDescricao: m.nomeDescricao, 
        motoristaNome: m.motoristaNome ?? '', 
        motoristaTelefone: m.motoristaTelefone ?? '', 
        placaVeiculo: m.placaVeiculo ?? '', 
        capacidadeMaximaFardos: m.capacidadeMaximaFardos, 
        pesoMaximoKg: m.pesoMaximoKg, 
        comprimentoM: m.comprimentoM ?? '', 
        observacoes: m.observacoes ?? '' 
      });
    } else {
      setEditando(null);
      reset({ nomeDescricao: '', motoristaNome: '', motoristaTelefone: '', placaVeiculo: '', capacidadeMaximaFardos: undefined, pesoMaximoKg: undefined, comprimentoM: undefined, observacoes: '' });
    }
    setModalOpen(true);
  }

  function closeModal() { 
    setModalOpen(false); 
    setEditando(null); 
    reset(); 
  }

  const onSubmit = (data: any) => {
    salvar.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Cadastro</h1>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Editar Veículo</h2>
                <p className="text-xs text-gray-500">Ajuste os dados mestre. As liberações vinculadas serão atualizadas.</p>
              </div>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-full transition">
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Nome do motorista</label>
                  <input {...register('motoristaNome')}
                    placeholder="João da Silva"
                    className={`w-full border ${errors.motoristaNome ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.motoristaNome && <p className="text-[10px] text-red-500 mt-1">{errors.motoristaNome.message}</p>}
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Telefone</label>
                  <input {...register('motoristaTelefone')}
                    placeholder="(66) 99999-9999"
                    className={`w-full border ${errors.motoristaTelefone ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.motoristaTelefone && <p className="text-[10px] text-red-500 mt-1">{errors.motoristaTelefone.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Modelo de Veículo*</label>
                  <select {...register('nomeDescricao')}
                    className={`w-full border ${errors.nomeDescricao ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`}>
                    <option value="">Selecione um modelo...</option>
                    <option value="LS GRANELEIRO">LS GRANELEIRO</option>
                    <option value="LS SIDER">LS SIDER</option>
                    <option value="BITREM">BITREM</option>
                    <option value="VANDERLEIA">VANDERLEIA</option>
                    <option value="VANDERLEIA SIDER">VANDERLEIA SIDER</option>
                    <option value="4º EIXOS">4º EIXOS</option>
                    <option value="4º EIXOS SIDER">4º EIXOS SIDER</option>
                    <option value="RODOTREM">RODOTREM</option>
                    <option value="RODOTREM SIDER">RODOTREM SIDER</option>
                    <option value="TRUCK">TRUCK</option>
                    <option value="TRUCK SIDER">TRUCK SIDER</option>
                    <option value="BITRUCK">BITRUCK</option>
                    <option value="BITRUCK SIDER">BITRUCK SIDER</option>
                  </select>
                  {errors.nomeDescricao && <p className="text-[10px] text-red-500 mt-1">{errors.nomeDescricao.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Placa do veículo</label>
                  <input {...register('placaVeiculo')}
                    placeholder="ABC1D23"
                    className={`w-full border ${errors.placaVeiculo ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.placaVeiculo && <p className="text-[10px] text-red-500 mt-1">{errors.placaVeiculo.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Capacidade (fardos)*</label>
                  <input type="number" {...register('capacidadeMaximaFardos')}
                    className={`w-full border ${errors.capacidadeMaximaFardos ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.capacidadeMaximaFardos && <p className="text-[10px] text-red-500 mt-1">{errors.capacidadeMaximaFardos.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Peso Máx (kg)*</label>
                  <input type="number" {...register('pesoMaximoKg')}
                    className={`w-full border ${errors.pesoMaximoKg ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.pesoMaximoKg && <p className="text-[10px] text-red-500 mt-1">{errors.pesoMaximoKg.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Metragem</label>
                  <input type="number" step="0.01" {...register('comprimentoM')}
                    placeholder="Metros de carga"
                    className={`w-full border ${errors.comprimentoM ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none`} />
                  {errors.comprimentoM && <p className="text-[10px] text-red-500 mt-1">{errors.comprimentoM.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Observações</label>
                  <input {...register('observacoes')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={salvar.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60 shadow-sm">
                  {salvar.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Filtros de Busca</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { if (confirm('Aplicar os dados do Cadastro Base a todas as liberações vinculadas?')) sincronizar.mutate(); }}
              disabled={sincronizar.isPending}
              className="text-xs text-green-700 hover:text-green-800 font-bold disabled:opacity-60"
            >
              {sincronizar.isPending ? 'Sincronizando...' : 'Sincronizar liberações'}
            </button>
            <button onClick={limparFiltros} className="text-xs text-blue-600 hover:text-blue-700 font-bold">Limpar filtros</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Modelo de Veículo</label>
            <input 
              value={filtros.nomeModelo} 
              onChange={(e) => setFiltros((f) => ({ ...f, nomeModelo: e.target.value }))}
              placeholder="Buscar por modelo..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Nome do Motorista</label>
            <input 
              value={filtros.nomeMotorista} 
              onChange={(e) => setFiltros((f) => ({ ...f, nomeMotorista: e.target.value }))}
              placeholder="Buscar por motorista..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Placa do Veículo</label>
            <input 
              value={filtros.placaVeiculo} 
              onChange={(e) => setFiltros((f) => ({ ...f, placaVeiculo: e.target.value }))}
              placeholder="Buscar por placa..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Status</label>
            <select 
              value={filtros.status} 
              onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase sticky top-0 z-10 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Veículo</th>
                  <th className="px-4 py-3 text-left">Placa</th>
                  <th className="px-4 py-3 text-left">Motorista</th>
                  <th className="px-4 py-3 text-left">Telefone</th>
                  <th className="px-4 py-3 text-right">Capacidade</th>
                  <th className="px-4 py-3 text-right">Peso Máx</th>
                  <th className="px-4 py-3 text-right">Metragem</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrarDados().map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900">{m.nomeDescricao}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.placaVeiculo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{m.motoristaNome ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.motoristaTelefone ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{m.capacidadeMaximaFardos} fardos</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{m.pesoMaximoKg?.toLocaleString('pt-BR')} kg</td>
                    <td className="px-4 py-3 text-right text-gray-700">{m.comprimentoM ? `${m.comprimentoM}m` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${m.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openModal(m)} className="p-1.5 hover:bg-blue-50 rounded transition group">
                          <PencilSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => { if(confirm('Excluir este cadastro?')) deletar.mutate(m.id) }} className="p-1.5 hover:bg-red-50 rounded transition group">
                          <TrashIcon className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrarDados().length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum veículo encontrado com os filtros aplicados</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
