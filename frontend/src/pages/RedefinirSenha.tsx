import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirmar: z.string().min(1, 'Confirme a senha'),
  })
  .refine((d) => d.password === d.confirmar, {
    message: 'As senhas não conferem',
    path: ['confirmar'],
  });

type FormData = z.infer<typeof schema>;

export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      toast.success('Senha redefinida! Faça login com a nova senha.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ui-background font-sans p-6">
      <div className="w-full max-w-sm">
        <h2 className="font-display text-xl font-semibold text-ui-text">Nova senha</h2>
        <p className="mt-1 mb-7 text-sm text-ui-text-muted">Escolha uma nova senha para acessar sua conta.</p>

        {!token ? (
          <div className="rounded-ui-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Link inválido ou incompleto. Peça uma nova redefinição.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ui-text">Nova senha</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="ui-input"
              />
              {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ui-text">Confirmar senha</label>
              <input
                {...register('confirmar')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="ui-input"
              />
              {errors.confirmar && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.confirmar.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="ui-btn-primary mt-2 w-full">
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm text-ui-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
