import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/Login';
import EsqueciSenhaPage from '@/pages/EsqueciSenha';
import RedefinirSenhaPage from '@/pages/RedefinirSenha';
import DashboardPage from '@/pages/Dashboard';
import LiberacoesPage from '@/pages/Liberacoes';
import LiberacaoDetalhe from '@/pages/Liberacoes/Detalhe';
import LiberacaoForm from '@/pages/Liberacoes/Form';
import AlertasPage from '@/pages/Alertas';
import UsuariosPage from '@/pages/Usuarios';
import CadastrosPage from '@/pages/Cadastros';
import ModelosPage from '@/pages/Cadastros/ModelosTab';
import AuditoriaPage from '@/pages/Auditoria';
import RelatoriosPage from '@/pages/Relatorios';
import GrPage from '@/pages/GR';
import AcessosClientePage from '@/pages/AcessosCliente';
import PosicaoPublica from '@/pages/Posicao/Publica';
import PosicaoVisitante from '@/pages/Posicao/Visitante';
import ConvitePage from '@/pages/Convite';
import EmailConfigPage from '@/pages/Configuracoes/Email';
import PermissoesPage from '@/pages/Configuracoes/Permissoes';

import { telaInicial } from '@/utils/perfis';
import { Acao, Tela, usePode } from '@/utils/permissoes';
import { primeiraTela } from '@/components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Dentro do sistema (Layout): GR fica só na /gr e Visitante na tela dele.
function PerfilComLayout({ children }: { children: React.ReactNode }) {
  const perfil = useAuthStore((s) => s.user?.perfil);
  const location = useLocation();
  if (perfil === 'VISITANTE') return <Navigate to="/minha-posicao" replace />;
  if (perfil === 'GR' && location.pathname !== '/gr') return <Navigate to="/gr" replace />;
  return <>{children}</>;
}

function RequireVisitante({ children }: { children: React.ReactNode }) {
  const perfil = useAuthStore((s) => s.user?.perfil);
  if (perfil !== 'VISITANTE') return <Navigate to={telaInicial(perfil)} replace />;
  return <>{children}</>;
}

function Inicio() {
  const perfil = useAuthStore((s) => s.user?.perfil);
  return <Navigate to={telaInicial(perfil)} replace />;
}

// Tela/ação liberada pelas permissões do perfil (Configurações › Permissões); senão
// manda para a primeira tela que o perfil pode abrir.
function RequireTela({ tela, acao = 'ver', children }: { tela: Tela; acao?: Acao; children: React.ReactNode }) {
  const perfil = useAuthStore((s) => s.user?.perfil);
  const pode = usePode();
  if (pode.carregando) return null;
  if (!pode(tela, acao)) {
    const destino = primeiraTela(perfil, (t) => pode(t));
    return <Navigate to={destino === window.location.pathname ? '/login' : destino} replace />;
  }
  return <>{children}</>;
}

// Gestão de usuários (inclusive criação de contas ADMIN) é restrita a ADMIN — mesma regra do backend (usuarios.routes.ts).
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const perfil = useAuthStore((s) => s.user?.perfil);
  if (perfil !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        {/* Sem login: link temporário do cliente e cadastro pelo convite */}
        <Route path="/posicao/:token" element={<PosicaoPublica />} />
        <Route path="/convite/:token" element={<ConvitePage />} />
        <Route path="/minha-posicao" element={<PrivateRoute><RequireVisitante><PosicaoVisitante /></RequireVisitante></PrivateRoute>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <PerfilComLayout>
                <Layout />
              </PerfilComLayout>
            </PrivateRoute>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="gr" element={<RequireTela tela="GR"><GrPage /></RequireTela>} />
          <Route path="dashboard" element={<RequireTela tela="DASHBOARD"><DashboardPage /></RequireTela>} />
          <Route path="liberacoes" element={<RequireTela tela="LIBERACOES"><LiberacoesPage /></RequireTela>} />
          <Route path="liberacoes/nova" element={<RequireTela tela="LIBERACOES" acao="incluir"><LiberacaoForm /></RequireTela>} />
          <Route path="liberacoes/:id" element={<RequireTela tela="LIBERACOES"><LiberacaoDetalhe /></RequireTela>} />
          <Route path="liberacoes/:id/editar" element={<RequireTela tela="LIBERACOES" acao="alterar"><LiberacaoForm /></RequireTela>} />
          <Route path="alertas" element={<RequireTela tela="ALERTAS"><AlertasPage /></RequireTela>} />
          <Route path="relatorios" element={<RequireTela tela="RELATORIOS"><RelatoriosPage /></RequireTela>} />
          <Route path="cadastros" element={<RequireTela tela="CADASTROS"><CadastrosPage /></RequireTela>} />
          <Route path="cadastros/modelos" element={<RequireTela tela="CADASTROS"><ModelosPage /></RequireTela>} />
          <Route path="configuracoes" element={<Navigate to="/configuracoes/usuarios" replace />} />
          <Route path="configuracoes/usuarios" element={<RequireAdmin><UsuariosPage /></RequireAdmin>} />
          <Route path="configuracoes/email" element={<RequireAdmin><EmailConfigPage /></RequireAdmin>} />
          <Route path="configuracoes/permissoes" element={<RequireAdmin><PermissoesPage /></RequireAdmin>} />
          <Route path="configuracoes/acessos-cliente" element={<RequireAdmin><AcessosClientePage /></RequireAdmin>} />
          <Route path="auditoria" element={<RequireAdmin><AuditoriaPage /></RequireAdmin>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
