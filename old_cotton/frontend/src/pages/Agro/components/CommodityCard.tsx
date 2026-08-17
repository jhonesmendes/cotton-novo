import type { CotacaoCommodity } from '@/services/mercado.service';

interface CommodityCardProps {
  data: CotacaoCommodity | null;
  loading?: boolean;
  emoji: string;
  cor: 'verde' | 'amarelo' | 'laranja';
}

export default function CommodityCard({ data, loading, emoji, cor }: CommodityCardProps) {
  const isPositivo = (data?.variacao_pct ?? 0) >= 0;
  const variacaoAbs = data?.variacao_abs ?? 0;

  if (loading) {
    return (
      <div className={`agro-commodity-card agro-skeleton cor-${cor}`}>
        <div className="skeleton-line w-24 h-4 mb-3" />
        <div className="skeleton-line w-40 h-8 mb-2" />
        <div className="skeleton-line w-32 h-4" />
      </div>
    );
  }

  const mostrarTon = data?.nome === 'Algodão';

  return (
    <div className={`agro-commodity-card cor-${cor}`}>
      {/* Header */}
      <div className="agro-commodity-header">
        <div className="agro-live-badge">
          <span className="agro-pulse-dot" />
          <span className="agro-live-label">{emoji} {data?.nome?.toUpperCase() ?? '—'} • ao vivo</span>
        </div>
        <span className={`agro-variacao-badge ${isPositivo ? 'positivo' : 'negativo'}`}>
          {isPositivo ? '▲' : '▼'} {data ? Math.abs(data.variacao_pct).toFixed(2) : '0.00'}%
        </span>
      </div>

      {/* Preço Brasil */}
      <div className="agro-commodity-preco-br">
        <span className="agro-commodity-cifra">R$</span>
        <span className="agro-commodity-valor">
          {data
            ? mostrarTon
              ? data.preco_br_rs_ton.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : data.preco_br_sc60.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—'}
        </span>
      </div>

      {/* Referência Brasil */}
      <div className="agro-commodity-ref-br">
        <span className="agro-ref-icon">📍</span>
        <span>{data?.referencia_br ?? '—'} • {mostrarTon ? 'R$/ton' : `sc 60kg`}</span>
      </div>

      {/* Divisor */}
      <div className="agro-commodity-divider" />

      {/* Internacional (CBOT/ICE) */}
      <div className="agro-commodity-intl-header">
        REFERÊNCIA INTERNACIONAL ({data?.nome === 'Algodão' ? 'ICE NY' : 'CBOT CHICAGO'}) • ao vivo
      </div>

      <div className="agro-commodity-intl-grid">
        <div className="agro-intl-item">
          <span className="agro-intl-label">{data?.nome === 'Algodão' ? 'ICE' : 'CBOT'}</span>
          <span className="agro-intl-valor">
            {data
              ? data.nome === 'Algodão'
                ? `${data.cbot_bu.toFixed(2)}¢/lb`
                : `${data.cbot_bu.toFixed(2)}¢/bu`
              : '—'}
          </span>
        </div>
        <div className="agro-intl-item">
          <span className="agro-intl-label">USD/ton</span>
          <span className="agro-intl-valor">
            {data ? `US$ ${data.cbot_usd_ton.toFixed(0)}` : '—'}
          </span>
        </div>
        <div className="agro-intl-item">
          <span className="agro-intl-label">Basis BR</span>
          <span className={`agro-intl-valor ${data && data.basis_usd >= 0 ? 'positivo' : 'negativo'}`}>
            {data ? `${data.basis_usd >= 0 ? '+' : ''}${data.basis_usd.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>

      {/* Variação absoluta */}
      <div className="agro-commodity-variacao-abs">
        <span className={`${isPositivo ? 'positivo' : 'negativo'}`}>
          {isPositivo ? '+' : ''}{variacaoAbs.toFixed(2)} {data?.nome === 'Algodão' ? '¢/lb' : '¢/bu'} hoje
        </span>
        <span className="agro-commodity-fonte">• {data?.fonte}</span>
      </div>
    </div>
  );
}
