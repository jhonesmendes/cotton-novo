import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/services/api';

const COLORS = ['#4f46e5', '#818cf8', '#2563eb', '#d97706', '#dc2626', '#0891b2'];

function renderPieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent, nome, name } = props;
  const label = nome ?? name;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#94a3b8" fontSize={11} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${label?.split('-')[0]} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function SaldoBarShape(props: any) {
  const { x, y, width, height, payload } = props;
  const isZero = payload?.saldo === 0;
  // a 0-length bar is invisible, so zero-saldo clients get a small fixed
  // stub instead — otherwise they look indistinguishable from missing data
  const w = isZero ? 6 : width;
  return <rect x={x} y={y} width={w} height={height} rx={4} ry={4} fill={isZero ? '#22c55e' : '#4f46e5'} />;
}

const MAX_DETALHES_TOOLTIP = 3;

function SaldoClienteTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const detalhes: { instrucao: string; localColeta: string }[] = item.detalhes ?? [];
  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ui-text">{item.nome}</p>
      <p className="text-ui-text-muted">Saldo: {item.saldo.toLocaleString('pt-BR')}</p>
      {detalhes.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-ui-border pt-2">
          {detalhes.slice(0, MAX_DETALHES_TOOLTIP).map((d, i) => (
            <div key={i}>
              <p className="text-ui-text">{d.instrucao}</p>
              <p className="text-ui-text-muted">Local de coleta: {d.localColeta}</p>
            </div>
          ))}
          {detalhes.length > MAX_DETALHES_TOOLTIP && (
            <p className="text-ui-text-muted">+{detalhes.length - MAX_DETALHES_TOOLTIP} outra(s)</p>
          )}
        </div>
      )}
    </div>
  );
}

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
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip content={<SaldoClienteTooltip />} />
            <Bar dataKey="saldo" name="Saldo" shape={<SaldoBarShape />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Por Filial */}
      <div className="ui-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ui-text">Volume Ativo por Filial</h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data.porFilial}
              dataKey="totalFardos"
              nameKey="nome"
              cx="50%"
              cy="55%"
              outerRadius={75}
              label={renderPieLabel}
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
