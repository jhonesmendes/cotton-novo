import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

// Permissões editáveis (Configurações › Permissões). Quem decide é o backend
// (exigirPermissao nas rotas); aqui só escondemos menu/botões que dariam 403.
export type Tela = 'DASHBOARD' | 'LIBERACOES' | 'VEICULOS' | 'HISTORICO' | 'GR' | 'ALERTAS' | 'RELATORIOS' | 'CADASTROS';
export type Acao = 'ver' | 'incluir' | 'alterar' | 'excluir';

export function usePermissoes() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<Record<string, Acao[]>>({
    queryKey: ['permissoes', 'minhas', userId],
    queryFn: () => api.get('/permissoes/minhas').then((r) => r.data.permissoes),
    enabled: !!token,
    staleTime: 60_000,
  });
}

// pode('LIBERACOES', 'incluir'). Enquanto carrega, responde false (ADMIN sempre true).
export function usePode() {
  const perfil = useAuthStore((s) => s.user?.perfil);
  const { data, isLoading } = usePermissoes();
  const pode = (tela: Tela, acao: Acao = 'ver') => perfil === 'ADMIN' || !!data?.[tela]?.includes(acao);
  return Object.assign(pode, { carregando: perfil !== 'ADMIN' && isLoading });
}
