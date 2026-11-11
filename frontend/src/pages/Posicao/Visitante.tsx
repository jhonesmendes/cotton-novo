import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import PosicaoCliente, { DadosPosicao } from '@/components/PosicaoCliente';

// Visitante logado: só esta tela, sem menu.
export default function PosicaoVisitante() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<DadosPosicao>({
    queryKey: ['posicao-visitante'],
    queryFn: () => api.get('/posicao-cliente').then((r) => r.data),
    refetchInterval: 60_000,
  });
  const sair = () => { logout(); navigate('/login'); };
  if (isLoading || !data) return <div className="p-10 text-center text-ui-text-muted">Carregando...</div>;
  return (
    <div className="min-h-screen bg-ui-background">
      <PosicaoCliente dados={data} rodapeExtra={
        <p>{user?.nome} · <button type="button" onClick={sair} className="font-semibold text-ui-primary hover:underline">Sair</button></p>
      } />
    </div>
  );
}
