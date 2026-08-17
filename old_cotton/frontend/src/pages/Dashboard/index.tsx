import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/services/api';
import DashboardResumo from './DashboardResumo';
import VeiculosVencendoTabela from './VeiculosVencendoTabela';
import DashboardKPIs from './DashboardKPIs';
import FiltrosDashboard, { FiltrosDashboardState } from './FiltrosDashboard';

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral das cargas em andamento</p>
        </div>
        <span className="text-xs text-gray-400">
          Atualiza a cada 5 min
        </span>
      </div>

      {/* Cards de resumo */}
      <DashboardResumo data={resumo} loading={loadResumo} />

      {/* Gráficos */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Análise de Dados</h2>
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
