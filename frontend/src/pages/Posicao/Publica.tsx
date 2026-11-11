import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PosicaoCliente, { DadosPosicao } from '@/components/PosicaoCliente';

// Link temporário (24 h), sem login. O token do link é a credencial.
export default function PosicaoPublica() {
  const { token } = useParams<{ token: string }>();
  const { data, error, isLoading } = useQuery<DadosPosicao>({
    queryKey: ['posicao-publica', token],
    // axios puro: sem token de sessão nem renovação.
    queryFn: () => axios.get(`/api/publico/posicao/${token}`).then((r) => r.data),
    refetchInterval: 60_000,
    retry: false,
  });
  if (isLoading) return <div className="p-10 text-center text-ui-text-muted">Carregando...</div>;
  if (error || !data) {
    const msg = (error as any)?.response?.data?.error?.message ?? 'Link inválido ou expirado.';
    return <div className="mx-auto max-w-md p-10 text-center"><p className="font-semibold text-ui-text">{msg}</p><p className="mt-2 text-sm text-ui-text-muted">Peça um novo link à Fibra Forte.</p></div>;
  }
  return <div className="min-h-screen bg-ui-background"><PosicaoCliente dados={data} /></div>;
}
