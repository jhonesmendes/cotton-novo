import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Edit2, Trash2, Plus } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

const localColetaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type LocalColetaFormData = z.infer<typeof localColetaSchema>;

export default function LocaisColetaTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeletar, setConfirmDeletar] = useState<any | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocalColetaFormData>({
    resolver: zodResolver(localColetaSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['locaisColeta'],
    queryFn: () => api.get('/locais-coleta').then((r) => r.data),
  });

  const locaisColeta = Array.isArray(response) ? response : response?.data || [];

  const salvar = useMutation({
    mutationFn: (data: LocalColetaFormData) => editingId ? api.put(`/locais-coleta/${editingId}`, data) : api.post('/locais-coleta', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locaisColeta'] });
      toast.success(editingId ? 'local de coleta atualizado!' : 'local de coleta criado!');
      handleCancel();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao salvar'),
  });

  const deletar = useMutation({
    mutationFn: (id: number) => api.delete(`/locais-coleta/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locaisColeta'] });
      toast.success('local de coleta removido!');
      setConfirmDeletar(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao remover'),
  });

  function handleEdit(c: any) {
    setEditingId(c.id);
    reset({ nome: c.nome, cidade: c.cidade, estado: c.estado });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    reset({ nome: '', cidade: '', estado: '' });
    setShowForm(false);
  }

  const onSubmit = (data: LocalColetaFormData) => {
    salvar.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Lista de locaisColeta</h2>
        <button
          onClick={() => { if (showForm) handleCancel(); else setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ui-primary text-white rounded-lg hover:bg-ui-primary-hover transition text-sm font-medium"
        >
          {showForm ? 'Fechar Formulário' : <><Plus size={18} /> Novo Local de Coleta</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-md font-bold mb-4">{editingId ? 'Editar Local de Coleta' : 'Novo Local de Coleta'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome*</label>
              <input {...register('nome')} placeholder="Ex: ALG ITAQUERE"
                className={`w-full px-3 py-1.5 border ${errors.nome ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.nome && <p className="text-[10px] text-red-500 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
              <input {...register('cidade')} placeholder="Ex: RONDONÓPOLIS"
                className={`w-full px-3 py-1.5 border ${errors.cidade ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.cidade && <p className="text-[10px] text-red-500 mt-1">{errors.cidade.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado (UF)</label>
              <input {...register('estado')} placeholder="MT" maxLength={2} style={{ textTransform: 'uppercase' }}
                onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                className={`w-full px-3 py-1.5 border ${errors.estado ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.estado && <p className="text-[10px] text-red-500 mt-1">{errors.estado.message}</p>}
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={handleCancel} className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={salvar.isPending} className="px-4 py-1.5 bg-ui-primary text-white rounded text-sm hover:bg-ui-primary-hover transition font-medium">
                {salvar.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : locaisColeta.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum local de coleta cadastrado.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-500">NOME</th>
                <th className="px-6 py-3 font-semibold text-gray-500">CIDADE</th>
                <th className="px-6 py-3 font-semibold text-gray-500">ESTADO (UF)</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-500">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locaisColeta.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{o.nome}</td>
                  <td className="px-6 py-4 text-gray-600">{o.cidade || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 font-bold">{o.estado || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(o)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setConfirmDeletar(o)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeletar}
        title="Remover local de coleta"
        message={`Deseja remover o local de coleta ${confirmDeletar?.nome}?`}
        confirmLabel="Sim, remover"
        variant="danger"
        loading={deletar.isPending}
        onConfirm={() => confirmDeletar && deletar.mutate(confirmDeletar.id)}
        onCancel={() => setConfirmDeletar(null)}
      />
    </div>
  );
}
