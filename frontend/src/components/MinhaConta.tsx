import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { Paleta, useThemeStore } from '@/stores/theme.store';

// Aplica as preferências salvas no usuário (chamado no login e ao abrir o sistema).
export function aplicarPreferencias(tema?: string | null, modo?: string | null) {
  const store = useThemeStore.getState();
  store.setPaleta(tema === 'VERDE' ? 'VERDE' : 'AZUL');
  if (modo === 'ESCURO') store.setTheme('dark');
  else if (modo === 'CLARO') store.setTheme('light');
}

// Grava no usuário (vale em qualquer computador) e no cache local.
export async function salvarPreferencias(prefs: { tema?: Paleta; modo?: 'CLARO' | 'ESCURO' }) {
  await api.patch('/auth/me/preferencias', prefs);
  const { token, refreshToken, user, setAuth } = useAuthStore.getState();
  if (token && refreshToken && user) setAuth(token, refreshToken, { ...user, ...prefs });
}

const PALETAS: { valor: Paleta; rotulo: string; amostras: string[] }[] = [
  { valor: 'VERDE', rotulo: 'Verde', amostras: ['#047857', '#10b981', '#d1fae5'] },
  { valor: 'AZUL', rotulo: 'Azul', amostras: ['#4f46e5', '#818cf8', '#e0e7ff'] },
];

export default function MinhaConta({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { paleta, theme, setPaleta, setTheme } = useThemeStore();
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function escolherPaleta(p: Paleta) {
    setPaleta(p);
    try { await salvarPreferencias({ tema: p }); } catch { toast.error('Não foi possível salvar o tema'); }
  }
  async function escolherModo(escuro: boolean) {
    setTheme(escuro ? 'dark' : 'light');
    try { await salvarPreferencias({ modo: escuro ? 'ESCURO' : 'CLARO' }); } catch { toast.error('Não foi possível salvar o modo'); }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (senha.nova !== senha.confirmar) return toast.error('As senhas novas não conferem');
    setSalvandoSenha(true);
    try {
      await api.post('/auth/me/senha', { atual: senha.atual, nova: senha.nova });
      toast.success('Senha alterada');
      setSenha({ atual: '', nova: '', confirmar: '' });
    } catch (err: any) {
      const e2 = err?.response?.data?.error;
      toast.error(e2?.details?.[0]?.message ?? e2?.message ?? 'Não foi possível trocar a senha');
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-ui-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-ui-text">Minha conta</h2>
            <p className="text-xs text-ui-text-muted">{user?.nome} · {user?.email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><XMarkIcon className="h-5 w-5 text-ui-text-muted" /></button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ui-text">Tema</h3>
            <div className="grid grid-cols-2 gap-3">
              {PALETAS.map((p) => (
                <button key={p.valor} type="button" onClick={() => escolherPaleta(p.valor)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left ${paleta === p.valor ? 'border-ui-primary ring-2 ring-ui-primary/30' : 'border-ui-border hover:bg-ui-muted'}`}>
                  <span>
                    <span className="block text-sm font-medium text-ui-text">{p.rotulo}</span>
                    <span className="mt-1 flex gap-1">{p.amostras.map((c) => <span key={c} className="h-4 w-4 rounded" style={{ background: c }} />)}</span>
                  </span>
                  {paleta === p.valor && <CheckIcon className="h-5 w-5 text-ui-primary" />}
                </button>
              ))}
            </div>
            <div className="mt-3 flex rounded-lg border border-ui-border p-0.5 text-sm">
              {[{ escuro: false, rotulo: 'Claro' }, { escuro: true, rotulo: 'Escuro' }].map((m) => (
                <button key={m.rotulo} type="button" onClick={() => escolherModo(m.escuro)}
                  className={`flex-1 rounded-md py-1.5 ${(theme === 'dark') === m.escuro ? 'bg-ui-primary text-white' : 'text-ui-text-muted'}`}>{m.rotulo}</button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ui-text-muted">Fica salvo no seu usuário — vale em qualquer computador.</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ui-text">Trocar senha</h3>
            <form onSubmit={trocarSenha} className="space-y-2">
              <input type="password" required autoComplete="current-password" placeholder="Senha atual" value={senha.atual}
                onChange={(e) => setSenha((s) => ({ ...s, atual: e.target.value }))} className="ui-input" />
              <input type="password" required autoComplete="new-password" placeholder="Nova senha (8+ caracteres, letra e número)" value={senha.nova}
                onChange={(e) => setSenha((s) => ({ ...s, nova: e.target.value }))} className="ui-input" />
              <input type="password" required autoComplete="new-password" placeholder="Confirmar nova senha" value={senha.confirmar}
                onChange={(e) => setSenha((s) => ({ ...s, confirmar: e.target.value }))} className="ui-input" />
              <button type="submit" disabled={salvandoSenha} className="ui-btn-primary w-full">{salvandoSenha ? 'Salvando...' : 'Trocar senha'}</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
