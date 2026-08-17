import { useQuery } from '@tanstack/react-query';
import { fetchDadosMercado, type DadosMercado } from '@/services/mercado.service';

export function useMercadoAgro() {
  return useQuery<DadosMercado>({
    queryKey: ['mercado-agro'],
    queryFn: fetchDadosMercado,
    refetchInterval: 10 * 60 * 1000, // Atualiza a cada 10 minutos
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });
}
