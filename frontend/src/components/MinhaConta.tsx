import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { Estilo, Paleta, useThemeStore } from '@/stores/theme.store';

// Aplica as preferências salvas no usuário (chamado no login e ao abrir o sistema).
export function aplicarPreferencias(tema?: string | null, modo?: string | null, estilo?: string | null) {
  const store = useThemeStore.getState();
  store.setPaleta(tema === 'VERDE' ? 'VERDE' : 'AZUL');
  store.setEstilo((['CONTROLE', 'LAVOURA', 'EXECUTIVO'].includes(estilo ?? '') ? estilo : 'CLASSICO') as Estilo);
  if (modo === 'ESCURO') store.setTheme('dark');
  else if (modo === 'CLARO') store.setTheme('light');
}

// Grava no usuário (vale em qualquer computador) e no cache local.
export async function salvarPreferencias(prefs: { tema?: Paleta; modo?: 'CLARO' | 'ESCURO'; estilo?: Estilo }) {
  await api.patch('/auth/me/preferencias', prefs);
  const { token, refreshToken, user, setAuth } = useAuthStore.getState();
  if (token && refreshToken && user) setAuth(token, refreshToken, { ...user, ...prefs });
}

// Miniatura de cada estilo: fundo, menu, card e texto (cores fixas só para a prévia).
const ESTILOS: { valor: Estilo; rotulo: string; descricao: string; fonte: string; menu: string; fundo: string; card: string; raio: number }[] = [
  { valor: 'CLASSICO', rotulo: 'Clássico', descricao: 'O visual atual', fonte: "'IBM Plex Sans'", menu: '#ffffff', fundo: '#f6f7f9', card: '#ffffff', raio: 6 },
  { valor: 'CONTROLE', rotulo: 'Controle', descricao: 'Denso, para varrer muitas linhas', fonte: "'Barlow Semi Condensed'", menu: '#0d141b', fundo: '#ecf0f4', card: '#ffffff', raio: 2 },
  { valor: 'LAVOURA', rotulo: 'Lavoura', descricao: 'Menu na cor da marca, com respiro', fonte: "'Plus Jakarta Sans'", menu: 'MARCA', fundo: '#f4f6f7', card: '#ffffff', raio: 10 },
  { valor: 'EXECUTIVO', rotulo: 'Executivo', descricao: 'Neutro, títulos e números grandes', fonte: "'Sora'", menu: '#ffffff', fundo: '#fafafa', card: '#ffffff', raio: 4 },
];

const PALETAS: { valor: Paleta; rotulo: string; amostras: string[] }[] = [
  { valor: 'VERDE', rotulo: 'Verde', amostras: ['#047857', '#10b981', '#d1fae5'] },
  { valor: 'AZUL', rotulo: 'Azul', amostras: ['#4f46e5', '#818cf8', '#e0e7ff'] },
];

export default function MinhaConta({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { paleta, theme, estilo, setPaleta, setTheme, setEstilo } = useThemeStore();
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' });
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function escolherPaleta(p: Paleta) {
    setPaleta(p);
    try { await salvarPreferencias({ tema: p }); } catch { toast.error('Não foi possível salvar o tema'); }
  }
  async function escolherEstilo(e: Estilo) {
    setEstilo(e);
    try { await salvarPreferencias({ estilo: e }); } catch { toast.error('Não foi possível salvar o estilo'); }
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
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-ui-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ui-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-ui-text">Minha conta</h2>
            <p className="text-xs text-ui-text-muted">{user?.nome} · {user?.email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><XMarkIcon className="h-5 w-5 text-ui-text-muted" /></button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ui-text">Estilo do painel</h3>
            <div className="grid grid-cols-2 gap-3">
              {ESTILOS.map((e) => {
                const marca = paleta === 'VERDE' ? '#064e3b' : '#312e81';
                return (
                  <button key={e.valor} type="button" onClick={() => escolherEstilo(e.valor)} aria-pressed={estilo === e.valor}
                    className={`rounded-xl border p-2 text-left ${estilo === e.valor ? 'border-ui-primary ring-2 ring-ui-primary/30' : 'border-ui-border hover:bg-ui-muted'}`}>
                    {/* Miniatura: menu + fundo + dois cards */}
                    <div className="flex h-14 overflow-hidden border border-black/10" style={{ background: e.fundo, borderRadius: e.raio }}>
                      <div className="w-5" style={{ background: e.menu === 'MARCA' ? marca : e.menu, borderRight: e.menu === '#ffffff' ? '1px solid #e5e7eb' : 'none' }} />
                      <div className="flex flex-1 flex-col gap-1 p-1.5">
                        <div className="h-2 w-10 rounded-sm" style={{ background: paleta === 'VERDE' ? '#047857' : '#4f46e5' }} />
                        <div className="flex flex-1 gap-1">
                          {[0, 1].map((i) => <div key={i} className="flex-1 border border-black/5" style={{ background: e.card, borderRadius: Math.max(1, e.raio - 2) }} />)}
                        </div>
                      </div>
                    </div>
                    <span className="mt-1.5 block text-sm font-semibold text-ui-text" style={{ fontFamily: e.fonte }}>{e.rotulo}</span>
                    <span className="block text-[11px] leading-tight text-ui-text-muted">{e.descricao}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ui-text">Cor</h3>
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
