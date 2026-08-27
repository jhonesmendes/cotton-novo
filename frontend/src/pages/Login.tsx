import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/services/api';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ui-background font-sans">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[440px] flex-shrink-0 flex-col justify-between bg-ui-primary p-12 text-white [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06),transparent_40%)]">
        <div className="flex items-center gap-2.5">
          <img src="/logo-fibra.jpeg" alt="Fibra Forte" className="h-9 w-9 rounded-ui-sm object-contain bg-white p-0.5" />
          <span className="font-display text-sm font-semibold">Cotton Fibra Forte</span>
        </div>

        <div>
          <h1 className="font-display max-w-sm text-3xl font-semibold leading-tight">
            Gestão de cargas de pluma de algodão, do pátio ao destino.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-indigo-100">
            Acompanhe liberações, prazos e veículos em um único lugar — com alertas antes que um deadline vire problema.
          </p>
        </div>

        <div className="flex gap-7">
          <div>
            <p className="font-display text-2xl font-bold">128</p>
            <p className="mt-0.5 text-[11px] text-indigo-200">Cargas ativas</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold">94%</p>
            <p className="mt-0.5 text-[11px] text-indigo-200">Taxa de cumprimento</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-xl font-semibold text-ui-text">Entrar</h2>
          <p className="mt-1 mb-7 text-sm text-ui-text-muted">Acesse o sistema de gestão de cargas.</p>

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
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium text-ui-text">Senha</label>
                <Link to="/esqueci-senha" className="text-xs font-medium text-ui-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="ui-input"
              />
              {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="ui-btn-primary mt-2 w-full"
            >
              {loading ? 'Acessando sistema...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-ui-text-muted">Acesso restrito a colaboradores autorizados.</p>
        </div>
      </div>
    </div>
  );
}
