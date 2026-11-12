import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon, Bars3Icon, BellAlertIcon, ChartBarIcon, ClipboardDocumentListIcon,
  Cog6ToothIcon, FolderIcon, HomeIcon, MagnifyingGlassIcon, MoonIcon, ShieldCheckIcon, SunIcon, XMarkIcon, FingerPrintIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import BuscaGlobal from './BuscaGlobal';
import { Tela, usePode } from '@/utils/permissoes';
import MinhaConta, { aplicarPreferencias, salvarPreferencias } from './MinhaConta';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import api from '@/services/api';

// `tela`: permissão editável (Configurações › Permissões); `perfis`: telas fixas de administração.
type ItemMenu = { to: string; label: string; icon: typeof HomeIcon; tela?: Tela; perfis?: string[] };

// Menu agrupado. `perfis` restringe o item; sem `perfis` = todos os perfis internos.
const grupos: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/dashboard', label: 'Dashboard', icon: HomeIcon, tela: 'DASHBOARD' },
      { to: '/liberacoes', label: 'Liberações', icon: ClipboardDocumentListIcon, tela: 'LIBERACOES' },
      { to: '/gr', label: 'GR', icon: FingerPrintIcon, tela: 'GR' },
      { to: '/alertas', label: 'Alertas', icon: BellAlertIcon, tela: 'ALERTAS' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { to: '/relatorios', label: 'Relatórios', icon: ChartBarIcon, tela: 'RELATORIOS' },
      { to: '/cadastros', label: 'Revisão de Dados', icon: FolderIcon, tela: 'CADASTROS' },
      { to: '/auditoria', label: 'Auditoria', icon: ShieldCheckIcon, perfis: ['ADMIN'] },
      { to: '/configuracoes/acessos-cliente', label: 'Acesso do cliente', icon: LinkIcon, perfis: ['ADMIN'] },
      { to: '/configuracoes', label: 'Configurações', icon: Cog6ToothIcon, perfis: ['ADMIN'] },
    ],
  },
];

// Perfil GR vê só a tela GR.
function itensDoPerfil(perfil: string | undefined, pode: (tela: Tela) => boolean) {
  if (perfil === 'GR') return [{ titulo: 'Operação', itens: grupos[0].itens.filter((i) => i.to === '/gr') }];
  return grupos
    .map((g) => ({ ...g, itens: g.itens.filter((i) => (i.tela ? pode(i.tela) : !i.perfis || (perfil && i.perfis.includes(perfil)))) }))
    .filter((g) => g.itens.length > 0);
}

// Primeira tela que o perfil pode abrir (para onde mandar quem não tem o Dashboard, por ex.).
export function primeiraTela(perfil: string | undefined, pode: (tela: Tela) => boolean) {
  return itensDoPerfil(perfil, pode)[0]?.itens[0]?.to ?? '/dashboard';
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/liberacoes': 'Liberações', '/alertas': 'Alertas', '/gr': 'GR — Gerenciadora de Risco',
  '/configuracoes': 'Configurações', '/configuracoes/usuarios': 'Configurações', '/configuracoes/acessos-cliente': 'Acesso do cliente', '/configuracoes/email': 'Configurações', '/configuracoes/permissoes': 'Configurações',
  '/cadastros': 'Revisão de Dados', '/cadastros/modelos': 'Revisão de Dados',
  '/auditoria': 'Auditoria', '/relatorios': 'Relatórios',
};

type SidebarContentProps = { onNavigate?: () => void; onLogout: () => void; onMinhaConta: () => void; userName?: string; perfil?: string; compacto?: boolean };

// Configurações fica ativo nas abas dele (Usuários / E-mail), não em Acesso do cliente.
const ativoEm = (to: string, pathname: string, isActive: boolean) =>
  to === '/configuracoes' ? /^\/configuracoes(\/(usuarios|email|permissoes))?$/.test(pathname) : isActive;

// Navegação horizontal (estilo Controle): mesmos itens, em linha no topo.
function NavTopo({ perfil }: { perfil?: string }) {
  const location = useLocation();
  const pode = usePode();
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegação principal">
      {itensDoPerfil(perfil, pode).map((g, gi) => (
        <div key={g.titulo} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-2 h-5 w-px bg-white/15" aria-hidden />}
          {g.itens.map(({ to, label, icon: Icon }) => (
            // Gestão: só ícone em telas médias (rótulo na dica) para a barra caber.
            <NavLink key={to} to={to} title={label}
              className={({ isActive }) => clsx('ui-nav-item ui-nav-topo flex items-center gap-1.5 whitespace-nowrap rounded-ui-md px-2.5 py-1.5 text-sm font-medium', ativoEm(to, location.pathname, isActive) && 'ui-nav-item-ativo')}>
              <Icon className="h-4 w-4 shrink-0" /><span className={gi > 0 ? 'sr-only 2xl:not-sr-only' : ''}>{label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate, onLogout, onMinhaConta, userName, perfil, compacto }: SidebarContentProps) {
  const location = useLocation();
  const pode = usePode();
  // Cores do menu vêm do estilo do usuário (styles/estilos.css, --sb-*).
  // Compacto (estilo Executivo): trilho só de ícones, rótulo aparece ao passar o mouse.
  const itemClass = (isActive: boolean) => clsx(
    'ui-nav-item group flex items-center rounded-ui-md text-sm font-medium transition-colors',
    compacto ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2',
    isActive && 'ui-nav-item-ativo',
  );

  return <>
    {/* Marca: mesma altura do cabeçalho do topo (h-14), as linhas divisórias ficam alinhadas. */}
    <div className={clsx('ui-sidebar-marca flex h-14 shrink-0 items-center gap-3 border-b', compacto ? 'justify-center px-2' : 'px-4')}>
      <span className="flex h-10 shrink-0 items-center rounded-ui-md bg-white px-1.5 shadow-sm">
        <img src="/logo-fibra-forte.png" alt="Fibra Forte" className="h-8 w-auto" />
      </span>
      <div className={compacto ? 'sr-only' : 'min-w-0 leading-tight'}>
        <span className="ui-marca-nome block font-display text-[15px] font-bold">Cotton</span>
        <span className="ui-marca-sub block text-[10px] font-medium uppercase tracking-wide">Gestão de cargas</span>
      </div>
    </div>
    <nav className={clsx('flex-1 space-y-4 pt-5', compacto ? 'flex flex-col items-center px-2' : 'px-3')} aria-label="Navegação principal">
      {itensDoPerfil(perfil, pode).map((g) => (
        <div key={g.titulo} className={clsx('space-y-0.5', compacto && 'flex flex-col items-center border-t border-white/0 pt-2 first:pt-0')}>
          <p className={clsx('ui-nav-grupo pb-1 text-[10px] font-semibold uppercase tracking-wider', compacto ? 'sr-only' : 'px-3')}>{g.titulo}</p>
          {g.itens.map(({ to, label, icon: Icon }) => (
            // Configurações: ativo nas abas dele, não em Acesso do cliente.
            <NavLink key={to} to={to} onClick={onNavigate} title={compacto ? label : undefined} aria-label={compacto ? label : undefined}
              className={({ isActive }) => itemClass(ativoEm(to, location.pathname, isActive))}>
              <Icon className={compacto ? 'h-5 w-5' : 'h-4 w-4'} />
              {compacto
                ? <span className="ui-trilho-dica pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-ui-sm px-2 py-1 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span>
                : label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
    <div className={clsx('ui-sidebar-rodape mt-auto border-t py-3', compacto ? 'flex flex-col items-center px-2' : 'px-3')}>
      <button type="button" onClick={() => { onNavigate?.(); onMinhaConta(); }} title="Minha conta: estilo, cor e senha"
        className={clsx('mb-1 flex items-center gap-2 rounded-ui-md py-1 text-left', compacto ? 'justify-center px-1' : 'w-full px-1')}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{userName?.charAt(0).toUpperCase() || 'A'}</div>
        <div className={compacto ? 'sr-only' : 'min-w-0'}>
          <p className="ui-usuario-nome truncate text-xs">{userName || 'Administrador'}</p>
          <p className="ui-marca-sub text-[10px]">Minha conta</p>
        </div>
      </button>
      <button type="button" onClick={onLogout} title={compacto ? 'Sair do Sistema' : undefined}
        className={clsx('flex items-center rounded-ui-md py-2 text-sm font-medium text-ui-text-muted transition-colors hover:bg-ui-muted hover:text-ui-text', compacto ? 'justify-center px-2' : 'w-full gap-3 px-2')}>
        <ArrowRightOnRectangleIcon className="h-4 w-4" />{compacto ? <span className="sr-only">Sair do Sistema</span> : 'Sair do Sistema'}
      </button>
    </div>
  </>;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle, estilo } = useThemeStore();
  // Estrutura da navegação muda com o estilo: Controle = barra no topo, Executivo = trilho de ícones.
  const navTopo = estilo === 'CONTROLE';
  const trilho = estilo === 'EXECUTIVO';
  const currentTitle = pageTitles[location.pathname]
    ?? (location.pathname.startsWith('/liberacoes/') ? 'Liberação' : 'Gestão de Cargas');
  const ehGr = user?.perfil === 'GR';
  const pode = usePode();
  const veAlertas = !ehGr && pode('ALERTAS');
  const buscaGlobal = !ehGr && pode('LIBERACOES');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [minhaConta, setMinhaConta] = useState(false);
  // Botão sol/lua do topo também grava no usuário.
  const alternarModo = () => {
    toggle();
    salvarPreferencias({ modo: useThemeStore.getState().theme === 'dark' ? 'ESCURO' : 'CLARO' }).catch(() => undefined);
  };

  // Busca global: Ctrl+K / ⌘K.
  useEffect(() => {
    if (!buscaGlobal) return;
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscaAberta(true); }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [buscaGlobal]);

  // Sino: alertas de prazo (vencido/hoje/crítico) + pendências de fechamento.
  const { data: alertas } = useQuery({
    queryKey: ['alertas', 'contador'],
    queryFn: () => api.get('/alertas?limit=1').then((r) => r.data),
    refetchInterval: 60_000,
    enabled: veAlertas,
  });
  const { data: pendencias } = useQuery({
    queryKey: ['alertas', 'pendencias-fechamento'],
    queryFn: () => api.get('/alertas/pendencias-fechamento').then((r) => r.data),
    refetchInterval: 60_000,
    enabled: veAlertas,
  });
  const totalAlertas = (alertas?.sumario ? alertas.sumario.vencidos + alertas.sumario.hoje + alertas.sumario.criticos : 0) + (pendencias?.total ?? 0);
  const handleLogout = () => { logout(); navigate('/login'); };

  // O perfil guardado no login pode estar desatualizado (ex: admin trocou o
  // perfil dessa pessoa) — sincroniza com o servidor ao abrir o sistema.
  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      const { token, refreshToken, user: atual, setAuth } = useAuthStore.getState();
      if (!token || !refreshToken || !atual) return;
      // Tema/modo salvos no usuário valem em qualquer computador.
      aplicarPreferencias(data.tema, data.modo, data.estilo);
      if (atual.perfil !== data.perfil || atual.nome !== data.nome || atual.email !== data.email) {
        setAuth(token, refreshToken, { ...atual, nome: data.nome, email: data.email, perfil: data.perfil });
      }
    }).catch(() => undefined);
  }, []);

  return <div className="min-h-screen bg-ui-background font-sans text-ui-text selection:bg-ui-primary selection:text-white">
    {!navTopo && (
      <aside className={clsx('ui-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r pb-3 md:flex', trilho ? 'w-[72px]' : 'w-56')}>
        <SidebarContent onLogout={handleLogout} onMinhaConta={() => setMinhaConta(true)} userName={user?.nome} perfil={user?.perfil} compacto={trilho} />
      </aside>
    )}
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
      <aside className="ui-sidebar relative flex h-full w-72 flex-col pb-3 shadow-2xl">
        <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted"><XMarkIcon className="h-5 w-5" /></button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} onMinhaConta={() => setMinhaConta(true)} userName={user?.nome} perfil={user?.perfil} />
      </aside>
    </div>}
    <div className={clsx('min-h-screen', navTopo ? '' : trilho ? 'md:pl-[72px]' : 'md:pl-56')}>
      <header className={clsx('ui-topbar sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ui-border bg-white/90 px-4 backdrop-blur md:px-7', navTopo && 'ui-topbar-nav')}>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className={clsx('rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted', navTopo ? 'lg:hidden' : 'md:hidden')}><Bars3Icon className="h-6 w-6" /></button>
          {navTopo ? (
            <>
              <span className="flex h-9 shrink-0 items-center rounded-ui-md bg-white px-1.5">
                <img src="/logo-fibra-forte.png" alt="Fibra Forte" className="h-7 w-auto" />
              </span>
              <span className="ui-marca-nome mr-3 hidden font-display text-[15px] font-bold xl:inline">Cotton</span>
              <NavTopo perfil={user?.perfil} />
            </>
          ) : (
            <div><p className="font-display text-sm font-semibold text-ui-text">{currentTitle}</p></div>
          )}
        </div>
        <div className="flex items-center gap-3 text-right">
          {buscaGlobal && (
            <button type="button" onClick={() => setBuscaAberta(true)} title="Busca global (Ctrl+K)"
              className="hidden items-center gap-2 rounded-ui-md border border-ui-border px-3 py-1.5 text-xs text-ui-text-muted hover:bg-ui-muted sm:flex">
              <MagnifyingGlassIcon className="h-4 w-4" /><span className={navTopo ? 'hidden 2xl:inline' : ''}>Placa, motorista, instrução</span>
              <kbd className="rounded border border-ui-border px-1 text-[10px]">Ctrl K</kbd>
            </button>
          )}
          {veAlertas && (
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
          {/* Safra é só escuro: sem alternância claro/escuro. */}
          {estilo !== 'SAFRA' && (
            <button type="button" onClick={alternarModo} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="rounded-ui-sm p-2 text-ui-text-muted hover:bg-ui-muted hover:text-ui-text">
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          )}
          {navTopo ? (
            <button type="button" onClick={() => setMinhaConta(true)} title="Minha conta: estilo, cor e senha"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{user?.nome?.charAt(0).toUpperCase() || 'A'}</button>
          ) : (
            <>
              <div className="hidden sm:block"><p className="text-sm font-medium text-ui-text">{user?.nome || 'Administrador'}</p><p className="text-xs text-ui-text-muted">Acesso administrativo</p></div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{user?.nome?.charAt(0).toUpperCase() || 'A'}</div>
            </>
          )}
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)]"><Outlet /></main>
      {buscaAberta && <BuscaGlobal onClose={() => setBuscaAberta(false)} />}
      {minhaConta && <MinhaConta onClose={() => setMinhaConta(false)} />}
    </div>
  </div>;
}
