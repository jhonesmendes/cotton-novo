import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import type { DadosMercado } from '@/services/mercado.service';

interface ComparativoChartProps {
  dados: DadosMercado;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="agro-chart-tooltip">
        <p className="agro-chart-tooltip-title">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.name.includes('USD') ? `US$ ${Number(p.value).toFixed(2)}` : `R$ ${Number(p.value).toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ComparativoChart({ dados }: ComparativoChartProps) {
  const { soja, milho, algodao, dolar } = dados;
  const cambio = dolar?.bid ?? 5.20;

  const chartData = [
    soja && {
      commodity: 'Soja',
      'BR (R$/sc60)': parseFloat(soja.preco_br_sc60.toFixed(2)),
      'INTL (USD/bu)': parseFloat(soja.cbot_bu.toFixed(2)),
      'Basis USD': soja.basis_usd,
    },
    milho && {
      commodity: 'Milho',
      'BR (R$/sc60)': parseFloat(milho.preco_br_sc60.toFixed(2)),
      'INTL (USD/bu)': parseFloat(milho.cbot_bu.toFixed(2)),
      'Basis USD': milho.basis_usd,
    },
    algodao && {
      commodity: 'Algodão',
      'BR (R$/ton)': parseFloat(algodao.preco_br_rs_ton.toFixed(2)),
      'INTL (¢/lb)': parseFloat(algodao.cbot_bu.toFixed(2)),
      'Basis USD': algodao.basis_usd,
    },
  ].filter(Boolean) as any[];

  // Spread table data
  const spreadData = [
    soja && {
      commodity: 'Soja 🌱',
      preco_br: `R$ ${soja.preco_br_sc60.toFixed(2)}/sc`,
      preco_intl: `${soja.cbot_bu.toFixed(2)}¢/bu`,
      usd_ton_intl: `US$ ${soja.cbot_usd_ton.toFixed(1)}`,
      usd_ton_br: `US$ ${(soja.preco_br_rs_ton / cambio).toFixed(1)}`,
      basis: soja.basis_usd >= 0 ? `+${soja.basis_usd}` : String(soja.basis_usd),
      spread_pct: soja.spread_pct,
      referencia: soja.referencia_br,
    },
    milho && {
      commodity: 'Milho 🌽',
      preco_br: `R$ ${milho.preco_br_sc60.toFixed(2)}/sc`,
      preco_intl: `${milho.cbot_bu.toFixed(2)}¢/bu`,
      usd_ton_intl: `US$ ${milho.cbot_usd_ton.toFixed(1)}`,
      usd_ton_br: `US$ ${(milho.preco_br_rs_ton / cambio).toFixed(1)}`,
      basis: milho.basis_usd >= 0 ? `+${milho.basis_usd}` : String(milho.basis_usd),
      spread_pct: milho.spread_pct,
      referencia: milho.referencia_br,
    },
    algodao && {
      commodity: 'Algodão 🏮',
      preco_br: `R$ ${algodao.preco_br_rs_ton.toFixed(0)}/ton`,
      preco_intl: `${algodao.cbot_bu.toFixed(2)}¢/lb`,
      usd_ton_intl: `US$ ${algodao.cbot_usd_ton.toFixed(1)}`,
      usd_ton_br: `US$ ${(algodao.preco_br_rs_ton / cambio).toFixed(1)}`,
      basis: algodao.basis_usd >= 0 ? `+${algodao.basis_usd}` : String(algodao.basis_usd),
      spread_pct: algodao.spread_pct,
      referencia: algodao.referencia_br,
    },
  ].filter(Boolean) as any[];

  return (
    <div className="agro-comparativo-section">
      <div className="agro-section-title">
        <span>📊</span> Comparativo Brasil × Internacional
        <span className="agro-section-subtitle">Câmbio: R$ {cambio.toFixed(4)}</span>
      </div>

      <div className="agro-comparativo-grid">
        {/* Tabela de Spread */}
        <div className="agro-spread-table-container">
          <table className="agro-spread-table">
            <thead>
              <tr>
                <th>Commodity</th>
                <th>🇧🇷 Preço BR</th>
                <th>🌍 Preço INTL</th>
                <th>USD/ton BR</th>
                <th>USD/ton INTL</th>
                <th>Basis</th>
                <th>Spread %</th>
              </tr>
            </thead>
            <tbody>
              {spreadData.map((row) => (
                <tr key={row.commodity}>
                  <td className="agro-td-commodity">
                    {row.commodity}
                    <span className="agro-td-ref">{row.referencia}</span>
                  </td>
                  <td className="agro-td-br">{row.preco_br}</td>
                  <td className="agro-td-intl">{row.preco_intl}</td>
                  <td>{row.usd_ton_br}</td>
                  <td>{row.usd_ton_intl}</td>
                  <td className={parseFloat(row.basis) >= 0 ? 'positivo' : 'negativo'}>
                    {row.basis}
                  </td>
                  <td className={row.spread_pct >= 0 ? 'positivo' : 'negativo'}>
                    {row.spread_pct >= 0 ? '▲' : '▼'} {Math.abs(row.spread_pct).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gráfico de barras */}
        <div className="agro-chart-container">
          <div className="agro-chart-label">Preço Internacional (¢/bu ou ¢/lb)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="commodity" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Bar dataKey="INTL (USD/bu)" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="INTL (¢/lb)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Basis USD" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
