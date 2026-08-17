import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon, Bars3Icon, BellAlertIcon, ClipboardDocumentListIcon,
  FolderIcon, HomeIcon, UsersIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/auth.store';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/liberacoes', label: 'Liberações', icon: ClipboardDocumentListIcon },
  { to: '/alertas', label: 'Alertas', icon: BellAlertIcon },
  { to: '/usuarios', label: 'Usuários', icon: UsersIcon },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/liberacoes': 'Liberações', '/alertas': 'Alertas',
  '/usuarios': 'Usuários', '/cadastros': 'Revisão de Dados',
};

type SidebarContentProps = { onNavigate?: () => void; onLogout: () => void; userName?: string };

function SidebarContent({ onNavigate, onLogout, userName }: SidebarContentProps) {
  const itemClass = (isActive: boolean) => clsx(
    'flex items-center gap-3 rounded-ui-md px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-white/15 text-white shadow-sm' : 'text-cotton-100 hover:bg-white/10 hover:text-white',
  );

  return <>
    <div className="flex flex-col items-center border-b border-white/10 px-6 py-5 text-center">
      <img src="/logo-fibra.jpeg" alt="Fibra Forte" className="mb-2 h-auto w-24 rounded-ui-md object-contain" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cotton-300">Gestão de Cargas</p>
    </div>
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegação principal">
      {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        <Icon className="h-5 w-5" />{label}
      </NavLink>)}
      <NavLink to="/cadastros" onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        <FolderIcon className="h-5 w-5" />Revisão de Dados
      </NavLink>
    </nav>
    <div className="mt-auto border-t border-white/10 px-4 pb-5 pt-4">
      <div className="mb-3 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-cotton-700 text-sm font-bold">{userName?.charAt(0).toUpperCase() || 'A'}</div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{userName || 'Administrador'}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-cotton-300">Online</p></div>
      </div>
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-ui-md px-2 py-2.5 text-sm font-medium text-cotton-100 transition-colors hover:bg-white/10 hover:text-white">
        <ArrowRightOnRectangleIcon className="h-5 w-5" />Sair do Sistema
      </button>
    </div>
  </>;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = pageTitles[location.pathname] || 'Gestão de Cargas';
  const handleLogout = () => { logout(); navigate('/login'); };

  return <div className="min-h-screen bg-ui-background font-sans text-ui-text selection:bg-ui-primary selection:text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-cotton-950 to-cotton-900 text-white shadow-xl md:flex">
      <SidebarContent onLogout={handleLogout} userName={user?.nome} />
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} />
      <aside className="relative flex h-full w-72 flex-col bg-gradient-to-b from-cotton-950 to-cotton-900 text-white shadow-2xl">
        <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-ui-sm p-2 text-cotton-100 hover:bg-white/10"><XMarkIcon className="h-5 w-5" /></button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} userName={user?.nome} />
      </aside>
    </div>}
    <div className="min-h-screen md:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ui-border bg-white/90 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted md:hidden"><Bars3Icon className="h-6 w-6" /></button>
          <div><p className="text-sm font-semibold text-ui-text">{currentTitle}</p><p className="hidden text-xs text-ui-text-muted sm:block">Gestão de Cargas</p></div>
        </div>
        <div className="flex items-center gap-2 text-right"><div className="hidden sm:block"><p className="text-sm font-medium text-ui-text">{user?.nome || 'Administrador'}</p><p className="text-xs text-ui-text-muted">Acesso administrativo</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-cotton-100 text-sm font-bold text-cotton-800">{user?.nome?.charAt(0).toUpperCase() || 'A'}</div></div>
      </header>
      <main className="min-h-[calc(100vh-4rem)]"><Outlet /></main>
    </div>
  </div>;
}
