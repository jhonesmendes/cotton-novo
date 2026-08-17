import type { CotacaoDolar } from '@/services/mercado.service';

interface DolarCardProps {
  data: CotacaoDolar | null;
  loading?: boolean;
}

export default function DolarCard({ data, loading }: DolarCardProps) {
  const isPositivo = (data?.pctChange ?? 0) >= 0;

  if (loading) {
    return (
      <div className="agro-dolar-card agro-skeleton">
        <div className="skeleton-line w-32 h-5 mb-2" />
        <div className="skeleton-line w-48 h-10" />
      </div>
    );
  }

  return (
    <div className="agro-dolar-card">
      <div className="agro-dolar-header">
        <div className="agro-live-badge">
          <span className="agro-pulse-dot" />
          <span className="agro-live-label">DÓLAR • ao vivo</span>
        </div>
        <div className="agro-dolar-fonte">
          USD/BRL • AwesomeAPI
        </div>
      </div>

      <div className="agro-dolar-valor">
        <span className="agro-dolar-cifra">R$</span>
        <span className="agro-dolar-numero">
          {data ? data.bid.toFixed(4) : '—'}
        </span>
        <span className={`agro-dolar-variacao ${isPositivo ? 'positivo' : 'negativo'}`}>
          {isPositivo ? '▲' : '▼'} {data ? Math.abs(data.pctChange).toFixed(2) : '0.00'}%
        </span>
      </div>

      <div className="agro-dolar-detalhes">
        <span>Min: {data ? `R$ ${data.low.toFixed(4)}` : '—'}</span>
        <span className="agro-dolar-divider">|</span>
        <span>Max: {data ? `R$ ${data.high.toFixed(4)}` : '—'}</span>
        <span className="agro-dolar-divider">|</span>
        <span>Compra: {data ? `R$ ${data.ask.toFixed(4)}` : '—'}</span>
      </div>
    </div>
  );
}
