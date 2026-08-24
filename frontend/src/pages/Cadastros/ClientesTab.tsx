import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Edit2, Trash2, Plus } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cnpj: z.string().min(14, 'CNPJ é obrigatório (mín. 14 chars)'),
  contatos: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

export default function ClientesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeletar, setConfirmDeletar] = useState<any | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/clientes').then((r) => r.data),
  });

  const clientes = Array.isArray(response) ? response : response?.data || [];

  const salvar = useMutation({
    mutationFn: (data: ClienteFormData) => editingId ? api.put(`/clientes/${editingId}`, data) : api.post('/clientes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(editingId ? 'Cliente atualizado!' : 'Cliente criado!');
      handleCancel();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao salvar'),
  });

  const deletar = useMutation({
    mutationFn: (id: number) => api.delete(`/clientes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente removido!');
      setConfirmDeletar(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao remover'),
  });

  function handleEdit(c: any) {
    setEditingId(c.id);
    reset({ nome: c.nome, email: c.email ?? '', cnpj: c.cnpj ?? '', contatos: c.contatos ?? '' });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    reset({ nome: '', email: '', cnpj: '', contatos: '' });
    setShowForm(false);
  }

  const onSubmit = (data: ClienteFormData) => {
    salvar.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Lista de Clientes</h2>
        <button
          onClick={() => { if (showForm) handleCancel(); else setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ui-primary text-white rounded-lg hover:bg-ui-primary-hover transition text-sm font-medium"
        >
          {showForm ? 'Fechar Formulário' : <><Plus size={18} /> Novo Cliente</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-md font-bold mb-4">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome*</label>
              <input {...register('nome')} placeholder="Ex: AMAGGI"
                className={`w-full px-3 py-1.5 border ${errors.nome ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.nome && <p className="text-[10px] text-red-500 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ*</label>
              <input {...register('cnpj')} placeholder="Apenas números ou formatado"
                className={`w-full px-3 py-1.5 border ${errors.cnpj ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.cnpj && <p className="text-[10px] text-red-500 mt-1">{errors.cnpj.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
              <input {...register('email')} placeholder="contato@empresa.com"
                className={`w-full px-3 py-1.5 border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`} />
              {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contatos (Telefone, Nomes)</label>
              <input {...register('contatos')} placeholder="Ex: João (66) 9999-9999"
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
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
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum cliente cadastrado.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-500">NOME</th>
                <th className="px-6 py-3 font-semibold text-gray-500">CNPJ</th>
                <th className="px-6 py-3 font-semibold text-gray-500">E-MAIL</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-500">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-6 py-4 text-gray-600">{c.cnpj}</td>
                  <td className="px-6 py-4 text-gray-600">{c.email || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(c)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setConfirmDeletar(c)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition">
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
        title="Remover Cliente"
        message={`Deseja remover o cliente ${confirmDeletar?.nome}?`}
        confirmLabel="Sim, remover"
        variant="danger"
        loading={deletar.isPending}
        onConfirm={() => confirmDeletar && deletar.mutate(confirmDeletar.id)}
        onCancel={() => setConfirmDeletar(null)}
      />
    </div>
  );
}
