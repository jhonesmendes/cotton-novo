import type { DadosMercado } from '@/services/mercado.service';

interface ParametrosCardProps {
  dados: DadosMercado;
}

interface RelacaoTroca {
  insumo: string;
  sc_soja: number;
  descricao: string;
  icon: string;
  cor: string;
}

export default function ParametrosCard({ dados }: ParametrosCardProps) {
  const { soja, dolar } = dados;
  const cambio = dolar?.bid ?? 5.20;

  const preco_soja_sc = soja?.preco_br_sc60 ?? 0;
  const preco_soja_usd = preco_soja_sc / cambio;

  // Referências típicas de mercado (USD/ton) - junho 2026
  const PRECO_UREIA_USD_TON = 380;
  const PRECO_DAP_MAP_USD_TON = 540;
  const PRECO_KCL_USD_TON = 320;

  // Conversões: 1 sc soja = 60kg = 0.06 ton
  const SC_SOJA_TON = 0.06;

  const relacoes: RelacaoTroca[] = [
    {
      insumo: 'Ureia',
      sc_soja: preco_soja_sc > 0 ? (PRECO_UREIA_USD_TON * cambio) / 1000 / preco_soja_sc * 1000 / SC_SOJA_TON : 0,
      descricao: `US$ ${PRECO_UREIA_USD_TON}/ton FOB`,
      icon: '🧪',
      cor: 'verde',
    },
    {
      insumo: 'DAP / MAP',
      sc_soja: preco_soja_sc > 0 ? (PRECO_DAP_MAP_USD_TON * cambio) / 1000 / preco_soja_sc * 1000 / SC_SOJA_TON : 0,
      descricao: `US$ ${PRECO_DAP_MAP_USD_TON}/ton FOB`,
      icon: '⚗️',
      cor: 'amarelo',
    },
    {
      insumo: 'KCl (Potassa)',
      sc_soja: preco_soja_sc > 0 ? (PRECO_KCL_USD_TON * cambio) / 1000 / preco_soja_sc * 1000 / SC_SOJA_TON : 0,
      descricao: `US$ ${PRECO_KCL_USD_TON}/ton FOB`,
      icon: '🔴',
      cor: 'laranja',
    },
  ];

  // Parâmetros de mercado exibidos
  const parametros = [
    { label: 'Câmbio USD/BRL', valor: `R$ ${cambio.toFixed(4)}`, icon: '💵' },
    { label: 'Soja Ref. BR', valor: soja ? `R$ ${soja.preco_br_sc60.toFixed(2)}/sc` : '—', icon: '🌱' },
    { label: 'Basis Soja', valor: soja ? `US$ ${soja.basis_usd >= 0 ? '+' : ''}${soja.basis_usd}` : '—', icon: '📐' },
    { label: 'CBOT Soja', valor: soja ? `${soja.cbot_bu.toFixed(2)}¢/bu` : '—', icon: '🇺🇸' },
    { label: 'Soja USD/ton', valor: soja ? `US$ ${soja.cbot_usd_ton.toFixed(1)}` : '—', icon: '📦' },
    { label: 'Soja R$/ton', valor: soja ? `R$ ${soja.preco_br_rs_ton.toFixed(0)}` : '—', icon: '🇧🇷' },
  ];

  return (
    <div className="agro-parametros-section">
      {/* Parâmetros de mercado */}
      <div className="agro-parametros-grid-header">
        <span className="agro-section-title">⚙️ Parâmetros de Mercado</span>
      </div>
      <div className="agro-parametros-grid">
        {parametros.map((p) => (
          <div key={p.label} className="agro-parametro-item">
            <span className="agro-parametro-icon">{p.icon}</span>
            <div>
              <div className="agro-parametro-label">{p.label}</div>
              <div className="agro-parametro-valor">{p.valor}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Relação de Troca */}
      <div className="agro-relacao-section">
        <div className="agro-section-title">
          <span>🔄</span> Relação de Troca — Sacas de Soja (60kg) por Tonelada de Insumo
          <span className="agro-section-subtitle">
            Soja ref: R$ {soja ? soja.preco_br_sc60.toFixed(2) : '—'}/sc •
            US$ {soja ? preco_soja_usd.toFixed(2) : '—'}/sc
          </span>
        </div>

        <div className="agro-relacao-grid">
          {relacoes.map((r) => (
            <div key={r.insumo} className={`agro-relacao-card cor-${r.cor}`}>
              <div className="agro-relacao-header">
                <span>{r.icon}</span>
                <span className="agro-relacao-insumo">{r.insumo}</span>
              </div>
              <div className="agro-relacao-valor">
                {r.sc_soja > 0 ? r.sc_soja.toFixed(1) : '—'}
                <span className="agro-relacao-unidade">sc/ton</span>
              </div>
              <div className="agro-relacao-desc">{r.descricao}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
