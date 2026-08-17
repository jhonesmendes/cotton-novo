import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon, BellAlertIcon, UsersIcon, ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon, FolderIcon, ChevronDownIcon, ChevronUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

const nav = [
  { to: '/dashboard',  label: 'Dashboard',      icon: HomeIcon },
  { to: '/liberacoes', label: 'Liberações',      icon: ClipboardDocumentListIcon },
  { to: '/alertas',    label: 'Alertas',         icon: BellAlertIcon },
  { to: '/usuarios',   label: 'Usuários',        icon: UsersIcon },
  { to: '/agro',       label: '🌿 Painel Agro IA', icon: ChartBarIcon, destaque: true },
];

const cadastrosSubmenu = [
  { label: 'Clientes', valor: 'clientes' },
  { label: 'Filiais Embarcadoras', valor: 'origens' },
  { label: 'Destinos', valor: 'destinos' },
  { label: 'Locais de Coleta', valor: 'locaisColeta' },
  { label: 'Origens', valor: 'terminais' },
  { label: 'Carretas', valor: 'carretas' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [cadastrosOpen, setCadastrosOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/cadastros') {
      setCadastrosOpen(true);
    }
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleCadastrosClick() {
    setCadastrosOpen((prev) => !prev);
    navigate('/cadastros');
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-cotton-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-cotton-950 to-cotton-900 text-white flex flex-col border-r border-cotton-800 shadow-xl z-20">
        <div className="px-6 py-5 border-b border-white/10 flex flex-col items-center justify-center text-center">
          <img
            src="/logo-fibra.jpeg"
            alt="Fibra Forte Logo"
            className="w-28 h-auto object-contain rounded-xl mb-2"
          />
          <p className="text-cotton-400/80 text-[11px] uppercase tracking-wider font-semibold">Gestão de Cargas</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon, destaque }: any) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? destaque
                      ? 'bg-green-900/60 text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.2)] border border-green-500/30'
                      : 'bg-white/10 text-white'
                    : destaque
                      ? 'text-green-400/90 hover:bg-green-900/40 hover:text-green-300 border border-green-700/20 hover:border-green-500/30'
                      : 'text-cotton-200/80 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={handleCadastrosClick}
            className={clsx(
              'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
              location.pathname === '/cadastros'
                ? 'bg-white/10 text-white'
                : 'text-cotton-200/80 hover:bg-white/5 hover:text-white',
            )}
          >
            <div className="flex items-center gap-3">
              <FolderIcon className="w-5 h-5 flex-shrink-0" />
              Cadastros Base
            </div>
            {cadastrosOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>

          {cadastrosOpen && (
            <div className="mt-1 mb-2 ml-10 pl-4 border-l border-white/10 space-y-1 relative">
              {cadastrosSubmenu.map(({ label, valor }) => (
                <NavLink
                  key={valor}
                  to={`/cadastros?tab=${valor}`}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center py-2 px-3 rounded-lg text-[13px] font-medium transition-all duration-200 relative group',
                      isActive
                        ? 'text-white'
                        : 'text-cotton-300/70 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Indicador de item ativo na linha lateral */}
                      {isActive && (
                        <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cotton-400" />
                      )}
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="px-4 pb-5 border-t border-white/10 pt-4 mt-auto">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
             <div className="w-8 h-8 rounded-full bg-cotton-800 border border-white/20 flex items-center justify-center font-bold text-sm text-white shadow-sm">
               {user?.nome?.[0]?.toUpperCase() || 'U'}
             </div>
             <div className="flex flex-col truncate">
               <span className="text-white text-sm font-medium truncate">{user?.nome}</span>
               <span className="text-cotton-400/70 text-[10px] uppercase tracking-wider font-semibold">Online</span>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-cotton-200/80 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 group"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
