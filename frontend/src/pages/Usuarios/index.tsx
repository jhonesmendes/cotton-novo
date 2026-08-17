import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  perfil: 'ADMIN' | 'OPERADOR' | 'GESTOR_FILIAL' | 'VISUALIZADOR' | 'CLIENTE';
  ativo: boolean;
  cliente?: { id: number; nome: string };
  filial?: { id: number; nome: string };
  lastLogin?: string;
  createdAt: string;
}

const PERFIS = [
  { value: 'ADMIN', label: 'Administrador', color: 'bg-red-100 text-red-800' },
  { value: 'OPERADOR', label: 'Operador', color: 'bg-blue-100 text-blue-800' },
  { value: 'GESTOR_FILIAL', label: 'Gestor de Filial', color: 'bg-purple-100 text-purple-800' },
  { value: 'VISUALIZADOR', label: 'Visualizador', color: 'bg-gray-100 text-gray-800' },
  { value: 'CLIENTE', label: 'Cliente', color: 'bg-green-100 text-green-800' },
];

const PERMISSOES_POR_PERFIL: Record<string, string[]> = {
  ADMIN: ['Dashboard', 'Liberações', 'Veículos', 'Alertas', 'Usuários', 'Modelos', 'Terminais', 'Configurações'],
  OPERADOR: ['Dashboard', 'Liberações', 'Veículos', 'Alertas'],
  GESTOR_FILIAL: ['Dashboard', 'Liberações', 'Veículos', 'Alertas', 'Usuários da Filial'],
  VISUALIZADOR: ['Dashboard', 'Liberações', 'Veículos'],
  CLIENTE: ['Dashboard', 'Minhas Liberações'],
};

const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().optional().or(z.literal('')),
  telefone: z.string().optional(),
  perfil: z.string().min(1, 'Perfil é obrigatório'),
}).refine(() => {
  // If not editing (no id), senha is required
  // But wait, the schema doesn't know about the ID here easily unless we pass it or use a separate schema.
  // Let's keep it simple: password required if it's empty and we're not in edit mode (handled in onSubmit logic or separate refine)
  return true;
}, {});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

export default function UsuariosPage() {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [confirmDesativar, setConfirmDesativar] = useState<Usuario | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: { perfil: 'OPERADOR' }
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['usuarios', busca],
    queryFn: () => api.get('/usuarios', { params: { busca } }).then(r => r.data),
  });

  const usuarios = Array.isArray(response) ? response : response?.data || [];

  const listarFiltrados = usuarios.filter((u: Usuario) =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase())
  );

  const mutatarCriar = useMutation({
    mutationFn: (data: any) => api.post('/usuarios', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      fecharModal();
      toast.success('Usuário criado com sucesso!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao criar usuário'),
  });

  const mutatarAtualizar = useMutation({
    mutationFn: (data: any) => api.put(`/usuarios/${usuarioEditando?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      fecharModal();
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao atualizar usuário'),
  });

  const mutatarDeletar = useMutation({
    mutationFn: (id: number) => api.delete(`/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário desativado com sucesso!');
      setConfirmDesativar(null);
    },
    onError: () => toast.error('Erro ao desativar usuário'),
  });

  const fecharModal = () => {
    setModalAberto(false);
    setUsuarioEditando(null);
    reset({ nome: '', email: '', senha: '', telefone: '', perfil: 'OPERADOR' });
  };

  const abrirNovoUsuario = () => {
    setUsuarioEditando(null);
    reset({ nome: '', email: '', senha: '', telefone: '', perfil: 'OPERADOR' });
    setModalAberto(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    reset({ nome: usuario.nome, email: usuario.email, senha: '', telefone: usuario.telefone || '', perfil: usuario.perfil });
    setModalAberto(true);
  };

  const onSubmit = (data: UsuarioFormData) => {
    if (!usuarioEditando && !data.senha) {
      toast.error('Senha é obrigatória para novos usuários');
      return;
    }

    const payload = { ...data };
    if (!payload.senha) delete payload.senha;

    if (usuarioEditando) {
      mutatarAtualizar.mutate(payload);
    } else {
      mutatarCriar.mutate(payload);
    }
  };

  const perfilLabel = (perfil: string) => PERFIS.find(p => p.value === perfil)?.label || perfil;
  const perfilColor = (perfil: string) => PERFIS.find(p => p.value === perfil)?.color || '';

  return (
    <div className="ui-page space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm">Gerenciamento de acesso ao sistema</p>
        </div>
        <button onClick={abrirNovoUsuario}
          className="ui-btn-primary">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* BUSCA */}
      <div className="ui-card p-4">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome ou email..."
          className="ui-input" />
      </div>

      {/* TABELA */}
      <div className="ui-card overflow-hidden">
        <div className="ui-card-header py-3 text-sm text-ui-text-muted">
          {listarFiltrados.length} usuário(s) encontrado(s)
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Perfil</th>
                  <th className="px-4 py-3 text-left">Telefone</th>
                  <th className="px-4 py-3 text-left">Último Acesso</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-subtle">
                {listarFiltrados.map((u: Usuario) => (
                  <tr key={u.id} className="transition-colors hover:bg-ui-muted/60">
                    <td className="px-4 py-3 font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${perfilColor(u.perfil)}`}>
                        {perfilLabel(u.perfil)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.telefone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.ativo ? (
                        <span className="flex items-center justify-center gap-1 text-green-600">
                          <Check className="w-4 h-4" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-red-600">
                          <X className="w-4 h-4" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button onClick={() => abrirEditar(u)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.ativo && (
                        <button onClick={() => setConfirmDesativar(u)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listarFiltrados.length === 0 && (
              <div className="p-8 text-center text-gray-400">Nenhum usuário encontrado</div>
            )}
          </div>
        )}
      </div>

      {/* PERMISSÕES REFERÊNCIA */}
      <div className="ui-card p-5">
        <h3 className="font-bold text-sm mb-4">Permissões por Perfil</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {PERFIS.map(perfil => (
            <div key={perfil.value} className="text-xs">
              <span className={`block px-2 py-1 rounded font-medium mb-2 text-center ${perfil.color}`}>
                {perfil.label}
              </span>
              <ul className="text-gray-600 space-y-1">
                {PERMISSOES_POR_PERFIL[perfil.value].map(perm => (
                  <li key={perm} className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-600" /> {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">
              {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input {...register('nome')}
                  className={`w-full border ${errors.nome ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm`} />
                {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register('email')}
                  type="email" className={`w-full border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {usuarioEditando && '(deixe em branco para manter)'}
                </label>
                <input {...register('senha')}
                  type="password" className={`w-full border ${errors.senha ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm`} />
                {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input {...register('telefone')}
                  className={`w-full border ${errors.telefone ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm`} />
                {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select {...register('perfil')}
                  className={`w-full border ${errors.perfil ? 'border-red-500' : 'border-gray-200'} rounded px-3 py-2 text-sm`}>
                  {PERFIS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {errors.perfil && <p className="text-xs text-red-500 mt-1">{errors.perfil.message}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={fecharModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-sm font-medium"
                  disabled={mutatarCriar.isPending || mutatarAtualizar.isPending}>
                  {mutatarCriar.isPending || mutatarAtualizar.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDesativar !== null}
        title="Desativar Usuário"
        message={`Tem certeza que deseja desativar o usuário "${confirmDesativar?.nome}"? O usuário perderá acesso ao sistema imediatamente.`}
        confirmLabel="Sim, desativar"
        variant="warning"
        loading={mutatarDeletar.isPending}
        onConfirm={() => confirmDesativar && mutatarDeletar.mutate(confirmDesativar.id)}
        onCancel={() => setConfirmDesativar(null)}
      />
    </div>
  );
}
