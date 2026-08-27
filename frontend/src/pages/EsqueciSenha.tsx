import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

type FormData = z.infer<typeof schema>;

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setEnviado(true);
    } catch {
      toast.error('Não foi possível processar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ui-background font-sans p-6">
      <div className="w-full max-w-sm">
        <h2 className="font-display text-xl font-semibold text-ui-text">Esqueci minha senha</h2>
        <p className="mt-1 mb-7 text-sm text-ui-text-muted">
          Informe seu email e, se houver uma conta cadastrada, enviaremos um link para redefinir a senha.
        </p>

        {enviado ? (
          <div className="rounded-ui-md border border-ui-border bg-ui-surface p-4 text-sm text-ui-text">
            Se o email existir no sistema, um link de redefinição foi enviado. Confira sua caixa de entrada
            (e o spam) nos próximos minutos.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ui-text">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                autoComplete="username"
                className="ui-input"
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="ui-btn-primary mt-2 w-full">
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
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
