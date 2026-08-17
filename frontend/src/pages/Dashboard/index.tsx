import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/services/api';
import DashboardResumo from './DashboardResumo';
import VeiculosVencendoTabela from './VeiculosVencendoTabela';
import DashboardKPIs from './DashboardKPIs';
import FiltrosDashboard, { FiltrosDashboardState } from './FiltrosDashboard';
import PageHeader from '@/components/ui/PageHeader';

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<FiltrosDashboardState>({
    clienteId: '', origemId: '', terminalId: '',
    status: '', diasMax: '30', busca: '',
  });

  const { data: resumo, isLoading: loadResumo } = useQuery({
    queryKey: ['dashboard-resumo'],
    queryFn: () => api.get('/dashboard/resumo').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Dashboard" description="Visão geral das cargas em andamento" action={<span className="text-xs text-ui-text-muted">Atualiza a cada 5 min</span>} />

      {/* Cards de resumo */}
      <DashboardResumo data={resumo} loading={loadResumo} />

      {/* Gráficos */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-ui-text">Análise de Dados</h2>
        {/* <DashboardCharts /> */}
      </div>

      {/* KPIs por cliente e filial */}
      <DashboardKPIs />

      {/* Filtros */}
      <FiltrosDashboard value={filtros} onChange={setFiltros} />

      {/* Tabela principal */}
      <VeiculosVencendoTabela filtros={filtros} />
    </div>
  );
}
