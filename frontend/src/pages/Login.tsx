import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    defaultValues: {
      email: 'admin@cottonfibraforte.com',
    }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cotton-950 via-cotton-900 to-black font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cotton-500/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cotton-700/20 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cotton-400 to-cotton-600 shadow-lg shadow-cotton-500/30 mb-5">
            <span className="text-3xl font-display font-bold text-white tracking-tighter">C</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Cotton Fibra</h1>
          <p className="text-cotton-200/80 text-sm mt-2 font-medium tracking-wide uppercase">Gestão de Cargas</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-cotton-200/90 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              {...register('email')}
              type="email"
              className={`w-full bg-white/5 border ${errors.email ? 'border-red-400' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-cotton-300/50 focus:outline-none focus:bg-white/10 focus:border-cotton-400 focus:ring-1 focus:ring-cotton-400 transition-all`}
            />
            {errors.email && <p className="text-[11px] font-medium text-red-400 mt-1.5">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-cotton-200/90 mb-1.5 uppercase tracking-wider">Senha</label>
            <input
              {...register('password')}
              type="password"
              placeholder="admin123"
              className={`w-full bg-white/5 border ${errors.password ? 'border-red-400' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-cotton-300/50 focus:outline-none focus:bg-white/10 focus:border-cotton-400 focus:ring-1 focus:ring-cotton-400 transition-all`}
            />
            {errors.password && <p className="text-[11px] font-medium text-red-400 mt-1.5">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cotton-500 hover:bg-cotton-400 text-cotton-950 font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cotton-500/20 disabled:opacity-60 hover:-translate-y-0.5 mt-2"
          >
            {loading ? 'Acessando sistema...' : 'Entrar na plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
}

