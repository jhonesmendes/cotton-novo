import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';

interface ChartData {
  statusDistribution: Array<{ name: string; value: number }>;
  cargasPorCliente: Array<{ cliente: string; volume: number }>;
  volumeAoLongo: Array<{ data: string; volume: number }>;
  topMotoristas: Array<{ motorista: string; cargas: number }>;
}

const COLORS = ['#059669', '#dc2626', '#f59e0b', '#0ea5e9', '#8b5cf6'];

export default function DashboardCharts() {
  const { data, isLoading } = useQuery<ChartData>({
    queryKey: ['dashboard-charts'],
    queryFn: () => api.get('/dashboard/charts').then((r) => r.data),
    refetchInterval: 10 * 60 * 1000, // 10 minutos
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico 1: Distribuição de Status */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data?.statusDistribution || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data?.statusDistribution?.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} cargas`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 2: Cargas por Cliente (Top 5) */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clientes por Volume</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.cargasPorCliente || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cliente" angle={-45} textAnchor="end" height={80} />
            <YAxis label={{ value: 'Fardos', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value} fardos`} />
            <Bar dataKey="volume" fill="#059669" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 3: Volume ao Longo do Tempo */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Carregado (Últimos 30 dias)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.volumeAoLongo || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis label={{ value: 'Fardos', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value} fardos`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#059669"
              strokeWidth={2}
              dot={{ fill: '#059669', r: 4 }}
              activeDot={{ r: 6 }}
              name="Volume Diário"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 4: Top Motoristas */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Motoristas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data?.topMotoristas || []}
            layout="vertical"
            margin={{ left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Cargas', position: 'insideBottomRight', offset: -5 }} />
            <YAxis dataKey="motorista" type="category" width={100} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => `${value} cargas`} />
            <Bar dataKey="cargas" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
