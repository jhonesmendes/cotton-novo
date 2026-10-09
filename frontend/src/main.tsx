import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1,
      // Telas abertas buscam de novo a cada 30s (só com a aba visível) — mostra
      // o que outros usuários alteraram sem precisar recarregar a página.
      refetchInterval: 1000 * 30,
      refetchOnWindowFocus: true,
    },
  },
  // Qualquer alteração salva com sucesso atualiza todas as telas (lista,
  // dashboard, alertas, auditoria...), não só a que fez a mudança.
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
