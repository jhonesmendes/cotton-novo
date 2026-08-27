import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Operador só edita cargas nas outras telas (veículos, status) — não cria/edita a Liberação em si.
function RequireLiberacaoWrite({ children }: { children: React.ReactNode }) {
  const perfil = useAuthStore((s) => s.user?.perfil);
  if (perfil === 'OPERADOR') return <Navigate to="/liberacoes" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="liberacoes" element={<LiberacoesPage />} />
          <Route path="liberacoes/nova" element={<RequireLiberacaoWrite><LiberacaoForm /></RequireLiberacaoWrite>} />
          <Route path="liberacoes/:id" element={<LiberacaoDetalhe />} />
          <Route path="liberacoes/:id/editar" element={<RequireLiberacaoWrite><LiberacaoForm /></RequireLiberacaoWrite>} />
          <Route path="alertas" element={<AlertasPage />} />
          <Route path="cadastros" element={<CadastrosPage />} />
          <Route path="cadastros/modelos" element={<ModelosPage />} />
          <Route path="configuracoes" element={<Navigate to="/configuracoes/usuarios" replace />} />
          <Route path="configuracoes/usuarios" element={<UsuariosPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
