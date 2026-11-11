import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Cadastro do Visitante pelo link do convite (vale 7 h): nome, telefone e senha.
export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', telefone: '', senha: '', confirmar: '' });
  const { data, error, isLoading } = useQuery({
    queryKey: ['convite', token],
    queryFn: () => axios.get(`/api/publico/convite/${token}`).then((r) => r.data),
    retry: false,
  });
  const aceitar = useMutation({
    mutationFn: () => axios.post(`/api/publico/convite/${token}`, { nome: form.nome, telefone: form.telefone, senha: form.senha }),
    onSuccess: () => { toast.success('Acesso criado! Entre com seu e-mail e senha.'); navigate('/login'); },
    onError: (e: any) => {
      const erro = e?.response?.data?.error;
      toast.error(erro?.details?.[0]?.message ?? erro?.message ?? 'Não foi possível criar o acesso');
    },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.senha !== form.confirmar) return toast.error('As senhas não conferem');
    if (form.senha.length < 8 || !/[A-Za-z]/.test(form.senha) || !/\d/.test(form.senha)) return toast.error('Senha: mínimo 8 caracteres, com letra e número');
    aceitar.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-background p-4">
      <div className="ui-card w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-3">
          <img src="/logo-fibra.jpeg" alt="Fibra Forte" className="h-10 w-10 rounded-ui-sm object-contain" />
          <div>
            <h1 className="font-display text-lg font-bold text-ui-text">Criar acesso</h1>
            <p className="text-xs text-ui-text-muted">Acompanhamento de cargas — Cotton Fibra Forte</p>
          </div>
        </div>
        {isLoading ? <p className="text-center text-ui-text-muted">Carregando...</p>
          : error || !data ? <p className="text-center text-sm text-ui-text">{(error as any)?.response?.data?.error?.message ?? 'Convite inválido ou expirado.'} Peça um novo convite à Fibra Forte.</p>
          : (
            <form onSubmit={enviar} className="space-y-3">
              <p className="text-sm text-ui-text-muted">Cliente <strong className="text-ui-text">{data.cliente}</strong> · e-mail <strong className="text-ui-text">{data.email}</strong></p>
              <input required value={form.nome} onChange={set('nome')} placeholder="Nome completo" className="ui-input" />
              <input required value={form.telefone} onChange={set('telefone')} placeholder="Telefone com DDD" className="ui-input" />
              <input required type="password" value={form.senha} onChange={set('senha')} placeholder="Senha (8+ caracteres, letra e número)" className="ui-input" autoComplete="new-password" />
              <input required type="password" value={form.confirmar} onChange={set('confirmar')} placeholder="Confirmar senha" className="ui-input" autoComplete="new-password" />
              <button type="submit" disabled={aceitar.isPending} className="ui-btn-primary w-full justify-center">{aceitar.isPending ? 'Criando...' : 'Criar acesso'}</button>
            </form>
          )}
      </div>
    </div>
  );
}
