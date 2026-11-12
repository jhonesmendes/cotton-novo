import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

// Mantém todas as abas abertas do sistema em dia entre si:
//  - salvou algo numa aba → as outras recarregam os dados na hora;
//  - entrou/saiu numa aba → as outras acompanham (sessão fica no localStorage);
//  - trocou estilo/tema → as outras acompanham.
const canal: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cotton') : null;

export function avisarDadosAlterados() {
  canal?.postMessage({ tipo: 'dados-alterados' });
}

export function iniciarSincronizacaoEntreAbas(queryClient: QueryClient) {
  if (canal) {
    canal.onmessage = (e) => {
      if (e.data?.tipo === 'dados-alterados') void queryClient.invalidateQueries();
    };
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'cotton-auth') {
      void useAuthStore.persist.rehydrate();
      // Sessão trocada em outra aba (outro usuário ou saiu): nada do cache vale mais.
      queryClient.clear();
    }
    if (e.key === 'cotton-theme') void useThemeStore.persist.rehydrate();
  });
}
