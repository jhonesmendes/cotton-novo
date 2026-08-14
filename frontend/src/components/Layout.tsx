import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon, BellAlertIcon, UsersIcon, ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon, FolderIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import clsx from 'clsx';

const nav = [
  { to: '/dashboard',  label: 'Dashboard',   icon: HomeIcon },
  { to: '/liberacoes', label: 'Liberações',   icon: ClipboardDocumentListIcon },
  { to: '/alertas',    label: 'Alertas',      icon: BellAlertIcon },
  { to: '/usuarios',   label: 'Usuários',     icon: UsersIcon },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
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
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-cotton-200/80 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          <NavLink to="/cadastros" className={({ isActive }) => clsx(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            isActive ? 'bg-white/10 text-white' : 'text-cotton-200/80 hover:bg-white/5 hover:text-white',
          )}>
              <FolderIcon className="w-5 h-5 flex-shrink-0" />
              Revisão de Dados
          </NavLink>
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
