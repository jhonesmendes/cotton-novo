import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon, Bars3Icon, BellAlertIcon, ClipboardDocumentListIcon,
  Cog6ToothIcon, FolderIcon, HomeIcon, MoonIcon, SunIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/liberacoes', label: 'Liberações', icon: ClipboardDocumentListIcon },
  { to: '/alertas', label: 'Alertas', icon: BellAlertIcon },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/liberacoes': 'Liberações', '/alertas': 'Alertas',
  '/configuracoes': 'Configurações', '/configuracoes/usuarios': 'Configurações',
  '/cadastros': 'Revisão de Dados', '/cadastros/modelos': 'Revisão de Dados',
};

type SidebarContentProps = { onNavigate?: () => void; onLogout: () => void; userName?: string; isAdmin?: boolean };

function SidebarContent({ onNavigate, onLogout, userName, isAdmin }: SidebarContentProps) {
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
    <nav className="flex-1 space-y-0.5 px-3" aria-label="Navegação principal">
      {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        <Icon className="h-4 w-4" />{label}
      </NavLink>)}
      <NavLink to="/cadastros" onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        <FolderIcon className="h-4 w-4" />Revisão de Dados
      </NavLink>
      {isAdmin && (
        <NavLink to="/configuracoes" onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
          <Cog6ToothIcon className="h-4 w-4" />Configurações
        </NavLink>
      )}
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
  const handleLogout = () => { logout(); navigate('/login'); };

  return <div className="min-h-screen bg-ui-background font-sans text-ui-text selection:bg-ui-primary selection:text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ui-border bg-ui-surface py-5 md:flex">
      <SidebarContent onLogout={handleLogout} userName={user?.nome} isAdmin={user?.perfil === 'ADMIN'} />
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} />
      <aside className="relative flex h-full w-72 flex-col bg-ui-surface py-5 shadow-2xl">
        <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted"><XMarkIcon className="h-5 w-5" /></button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} userName={user?.nome} isAdmin={user?.perfil === 'ADMIN'} />
      </aside>
    </div>}
    <div className="min-h-screen md:pl-56">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ui-border bg-white/90 px-4 backdrop-blur md:px-7">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted md:hidden"><Bars3Icon className="h-6 w-6" /></button>
          <div><p className="font-display text-sm font-semibold text-ui-text">{currentTitle}</p></div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <button type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted hover:text-ui-text">
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          <div className="hidden sm:block"><p className="text-sm font-medium text-ui-text">{user?.nome || 'Administrador'}</p><p className="text-xs text-ui-text-muted">Acesso administrativo</p></div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{user?.nome?.charAt(0).toUpperCase() || 'A'}</div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)]"><Outlet /></main>
    </div>
  </div>;
}
