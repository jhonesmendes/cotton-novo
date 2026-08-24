import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import { Trash2, Edit2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Terminal {
  id: number;
  nome: string;
}

const terminalSchema = z.object({
  nome: z.string().min(1, 'Nome da origem é obrigatório'),
});

type TerminalFormData = z.infer<typeof terminalSchema>;

export default function OrigensPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeletar, setConfirmDeletar] = useState<Terminal | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TerminalFormData>({
    resolver: zodResolver(terminalSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['Origens'],
    queryFn: () => api.get('/terminais').then(r => r.data),
  });

  const Origens = Array.isArray(response) ? response : response?.data || [];

  const mutatarCriar = useMutation({
    mutationFn: (data: TerminalFormData) => api.post('/terminais', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Origens'] });
      handleCancel();
      toast.success('Terminal criado com sucesso!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao criar terminal'),
  });

  const mutatarAtualizar = useMutation({
    mutationFn: (data: TerminalFormData) => api.put(`/terminais/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Origens'] });
      handleCancel();
      toast.success('Terminal atualizado com sucesso!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao atualizar terminal'),
  });

  const mutatarDeletar = useMutation({
    mutationFn: (id: number) => api.delete(`/terminais/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Origens'] });
      toast.success('Terminal deletado com sucesso!');
      setConfirmDeletar(null);
    },
    onError: () => toast.error('Erro ao deletar terminal'),
  });

  const onSubmit = (data: TerminalFormData) => {
    if (editingId) {
      mutatarAtualizar.mutate(data);
    } else {
      mutatarCriar.mutate(data);
    }
  };

  const handleEdit = (terminal: Terminal) => {
    reset({
      nome: terminal.nome,
    });
    setEditingId(terminal.id);
    setShowForm(true);
  };

  const handleDelete = (terminal: Terminal) => {
    setConfirmDeletar(terminal);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    reset({ nome: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Lista de Origens</h2>
        <button
          onClick={() => {
            if (showForm) handleCancel();
            else setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-ui-primary text-white rounded-lg hover:bg-ui-primary-hover transition text-sm font-medium"
        >
          {showForm ? 'Fechar' : <><Plus size={18} /> Nova Origem</>}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-sm">
            {editingId ? 'Editar Origem' : 'Adicionar Nova Origem'}
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                NOME
              </label>
              <input {...register('nome')}
                placeholder="Ex: Terminal João de Barro"
                className={`w-full px-3 py-1.5 border ${errors.nome ? 'border-red-500' : 'border-gray-200'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              {errors.nome && <p className="text-[10px] text-red-500 mt-1">{errors.nome.message}</p>}
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-ui-primary text-white rounded text-sm hover:bg-ui-primary-hover transition font-medium"
                disabled={mutatarCriar.isPending || mutatarAtualizar.isPending}
              >
                {mutatarCriar.isPending || mutatarAtualizar.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Origens */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : Origens.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-4">Nenhum terminal cadastrado ainda</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ui-primary text-white rounded-lg hover:bg-ui-primary-hover transition text-sm"
            >
              <Plus size={18} />
              Cadastrar Primeiro Terminal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    ORIGEM
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Origens.map((terminal: Terminal) => (
                  <tr key={terminal.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {terminal.nome}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(terminal)}
                          className="text-blue-600 hover:bg-blue-50 transition p-1.5 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(terminal)}
                          className="text-red-600 hover:bg-red-50 transition p-1.5 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDeletar !== null}
        title="Deletar Origem"
        message={`Tem certeza que deseja deletar a origem "${confirmDeletar?.nome}"?`}
        confirmLabel="Sim, deletar"
        variant="danger"
        loading={mutatarDeletar.isPending}
        onConfirm={() => confirmDeletar && mutatarDeletar.mutate(confirmDeletar.id)}
        onCancel={() => setConfirmDeletar(null)}
      />
    </div>
  );
}

