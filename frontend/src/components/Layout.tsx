import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon, Bars3Icon, BellAlertIcon, ChartBarIcon, ClipboardDocumentListIcon,
  Cog6ToothIcon, FolderIcon, HomeIcon, MagnifyingGlassIcon, MoonIcon, ShieldCheckIcon, SunIcon, XMarkIcon, FingerPrintIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import BuscaGlobal from './BuscaGlobal';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import api from '@/services/api';

type ItemMenu = { to: string; label: string; icon: typeof HomeIcon; perfis?: string[] };

// Menu agrupado. `perfis` restringe o item; sem `perfis` = todos os perfis internos.
const grupos: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
      { to: '/liberacoes', label: 'Liberações', icon: ClipboardDocumentListIcon },
      { to: '/gr', label: 'GR', icon: FingerPrintIcon, perfis: ['ADMIN', 'GESTOR_FILIAL', 'OPERADOR', 'GR'] },
      { to: '/alertas', label: 'Alertas', icon: BellAlertIcon },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { to: '/relatorios', label: 'Relatórios', icon: ChartBarIcon },
      { to: '/cadastros', label: 'Revisão de Dados', icon: FolderIcon },
      { to: '/auditoria', label: 'Auditoria', icon: ShieldCheckIcon, perfis: ['ADMIN'] },
      { to: '/configuracoes/acessos-cliente', label: 'Acesso do cliente', icon: LinkIcon, perfis: ['ADMIN'] },
      { to: '/configuracoes', label: 'Configurações', icon: Cog6ToothIcon, perfis: ['ADMIN'] },
    ],
  },
];

// Perfil GR vê só a tela GR.
function itensDoPerfil(perfil?: string) {
  if (perfil === 'GR') return [{ titulo: 'Operação', itens: grupos[0].itens.filter((i) => i.to === '/gr') }];
  return grupos.map((g) => ({ ...g, itens: g.itens.filter((i) => !i.perfis || (perfil && i.perfis.includes(perfil))) }));
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/liberacoes': 'Liberações', '/alertas': 'Alertas', '/gr': 'GR — Gerenciadora de Risco',
  '/configuracoes': 'Configurações', '/configuracoes/usuarios': 'Configurações', '/configuracoes/acessos-cliente': 'Acesso do cliente',
  '/cadastros': 'Revisão de Dados', '/cadastros/modelos': 'Revisão de Dados',
  '/auditoria': 'Auditoria', '/relatorios': 'Relatórios',
};

type SidebarContentProps = { onNavigate?: () => void; onLogout: () => void; userName?: string; perfil?: string };

function SidebarContent({ onNavigate, onLogout, userName, perfil }: SidebarContentProps) {
  const itemClass = (isActive: boolean) => clsx(
    'flex items-center gap-3 rounded-ui-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-ui-text-muted hover:bg-ui-muted hover:text-ui-text',
  );

  return <>
    <div className="flex items-center gap-2.5 px-4 pb-5 pt-1">
      <img src="/logo-fibra.jpeg" alt="Fibra Forte" className="h-9 w-9 rounded-ui-sm object-contain" />
      <div>
        <span className="font-display text-sm font-semibold text-ui-text">Cotton Fibra</span>
        <p className="text-[10px] font-medium uppercase tracking-wide text-ui-text-muted">Gestão de Cargas</p>
      </div>
    </div>
    <nav className="flex-1 space-y-4 px-3" aria-label="Navegação principal">
      {itensDoPerfil(perfil).map((g) => (
        <div key={g.titulo} className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ui-text-muted">{g.titulo}</p>
          {g.itens.map(({ to, label, icon: Icon }) => (
            // `end` no Configurações para não ficar ativo junto com Acesso do cliente.
            <NavLink key={to} to={to} end={to === '/configuracoes'} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
    <div className="mt-auto border-t border-ui-border px-3 py-3">
      <div className="mb-1 flex items-center gap-2 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{userName?.charAt(0).toUpperCase() || 'A'}</div>
        <p className="truncate text-xs text-ui-text-muted">{userName || 'Administrador'}</p>
      </div>
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-ui-md px-2 py-2 text-sm font-medium text-ui-text-muted transition-colors hover:bg-ui-muted hover:text-ui-text">
        <ArrowRightOnRectangleIcon className="h-4 w-4" />Sair do Sistema
      </button>
    </div>
  </>;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useThemeStore();
  const currentTitle = pageTitles[location.pathname] || 'Gestão de Cargas';
  const ehGr = user?.perfil === 'GR';
  const [buscaAberta, setBuscaAberta] = useState(false);

  // Busca global: Ctrl+K / ⌘K.
  useEffect(() => {
    if (ehGr) return;
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscaAberta(true); }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [ehGr]);

  // Sino: alertas de prazo (vencido/hoje/crítico) + pendências de fechamento.
  const { data: alertas } = useQuery({
    queryKey: ['alertas', 'contador'],
    queryFn: () => api.get('/alertas?limit=1').then((r) => r.data),
    refetchInterval: 60_000,
    enabled: !ehGr,
  });
  const { data: pendencias } = useQuery({
    queryKey: ['alertas', 'pendencias-fechamento'],
    queryFn: () => api.get('/alertas/pendencias-fechamento').then((r) => r.data),
    refetchInterval: 60_000,
    enabled: !ehGr,
  });
  const totalAlertas = (alertas?.sumario ? alertas.sumario.vencidos + alertas.sumario.hoje + alertas.sumario.criticos : 0) + (pendencias?.total ?? 0);
  const handleLogout = () => { logout(); navigate('/login'); };

  // O perfil guardado no login pode estar desatualizado (ex: admin trocou o
  // perfil dessa pessoa) — sincroniza com o servidor ao abrir o sistema.
  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      const { token, refreshToken, user: atual, setAuth } = useAuthStore.getState();
      if (!token || !refreshToken || !atual) return;
      if (atual.perfil !== data.perfil || atual.nome !== data.nome || atual.email !== data.email) {
        setAuth(token, refreshToken, { ...atual, nome: data.nome, email: data.email, perfil: data.perfil });
      }
    }).catch(() => undefined);
  }, []);

  return <div className="min-h-screen bg-ui-background font-sans text-ui-text selection:bg-ui-primary selection:text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ui-border bg-ui-surface py-5 md:flex">
      <SidebarContent onLogout={handleLogout} userName={user?.nome} perfil={user?.perfil} />
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} />
      <aside className="relative flex h-full w-72 flex-col bg-ui-surface py-5 shadow-2xl">
        <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted"><XMarkIcon className="h-5 w-5" /></button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} userName={user?.nome} perfil={user?.perfil} />
      </aside>
    </div>}
    <div className="min-h-screen md:pl-56">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ui-border bg-white/90 px-4 backdrop-blur md:px-7">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted md:hidden"><Bars3Icon className="h-6 w-6" /></button>
          <div><p className="font-display text-sm font-semibold text-ui-text">{currentTitle}</p></div>
        </div>
        <div className="flex items-center gap-3 text-right">
          {!ehGr && (
            <button type="button" onClick={() => setBuscaAberta(true)} title="Busca global (Ctrl+K)"
              className="hidden items-center gap-2 rounded-ui-md border border-ui-border px-3 py-1.5 text-xs text-ui-text-muted hover:bg-ui-muted sm:flex">
              <MagnifyingGlassIcon className="h-4 w-4" />Placa, motorista, instrução
              <kbd className="rounded border border-ui-border px-1 text-[10px]">Ctrl K</kbd>
            </button>
          )}
          {!ehGr && (
            <button type="button" onClick={() => navigate('/alertas')} aria-label={`${totalAlertas} alertas`} title="Alertas"
              className="relative rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted hover:text-ui-text">
              <BellAlertIcon className="h-5 w-5" />
              {totalAlertas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {totalAlertas > 99 ? '99+' : totalAlertas}
                </span>
              )}
            </button>
          )}
          <button type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted hover:text-ui-text">
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          <div className="hidden sm:block"><p className="text-sm font-medium text-ui-text">{user?.nome || 'Administrador'}</p><p className="text-xs text-ui-text-muted">Acesso administrativo</p></div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{user?.nome?.charAt(0).toUpperCase() || 'A'}</div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)]"><Outlet /></main>
      {buscaAberta && <BuscaGlobal onClose={() => setBuscaAberta(false)} />}
    </div>
  </div>;
}
