import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/services/api';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function DashboardKPIs() {
  const { data } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get('/dashboard/kpis').then((r) => r.data),
  });

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Por Cliente */}
      <div className="ui-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ui-text">Fardos Pendentes por Cliente</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.porCliente} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
            <Bar dataKey="saldo" name="Saldo" fill="#16a34a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Por Filial */}
      <div className="ui-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ui-text">Volume Ativo por Filial</h2>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data.porFilial}
              dataKey="totalFardos"
              nameKey="nome"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ nome, percent }) => `${nome?.split('-')[0]} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.porFilial.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
