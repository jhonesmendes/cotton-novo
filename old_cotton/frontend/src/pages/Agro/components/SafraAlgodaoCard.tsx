import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function useSafraAlgodao() {
  return useQuery({
    queryKey: ['safra-algodao'],
    queryFn: () => api.get('/mercado/safra/algodao').then(r => r.data),
    staleTime: 60 * 60 * 1000,    // 1 hora (dados mensais)
    refetchInterval: 60 * 60 * 1000,
  });
}

// ─── Barra de progresso personalizada ────────────────────────────────────────
function ProgressBar({ value, cor, label }: { value: number; cor: string; label: string }) {
  return (
    <div className="agro-progress-item">
      <div className="agro-progress-label">
        <span>{label}</span>
        <span className="agro-progress-value">{value}%</span>
      </div>
      <div className="agro-progress-track">
        <div
          className="agro-progress-fill"
          style={{ width: `${value}%`, background: cor }}
        />
      </div>
    </div>
  );
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="agro-chart-tooltip">
        <p style={{ color: payload[0].payload.fill, fontWeight: 700 }}>
          {payload[0].name}
        </p>
        <p>{payload[0].value.toLocaleString('pt-BR')} mil ton</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
          {payload[0].payload.participacao_pct}% do mercado
        </p>
      </div>
    );
  }
  return null;
};

const CORES_PRODUTORES = ['#f59e0b', '#ef4444', '#3b82f6', '#4ade80', '#a78bfa', '#94a3b8'];
const CORES_EXPORTADORES = ['#3b82f6', '#4ade80', '#fbbf24', '#94a3b8'];

export default function SafraAlgodaoCard() {
  const { data, isLoading, isError } = useSafraAlgodao();

  if (isLoading) {
    return (
      <div className="agro-safra-section agro-skeleton">
        <div className="skeleton-line w-48 h-6 mb-4" />
        <div className="agro-safra-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-line h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="agro-safra-section">
        <div className="agro-section-title">🏮 Índice de Colheita — Algodão</div>
        <div className="agro-error-inline">⚠️ Não foi possível carregar os dados da safra.</div>
      </div>
    );
  }

  const { safra_br, safra_mundial, calendario, indicadores } = data;

  return (
    <div className="agro-safra-section">
      {/* Título */}
      <div className="agro-safra-header">
        <div className="agro-section-title">
          🏮 Índice de Colheita — Algodão
          <span className="agro-section-subtitle">
            Safra {safra_br.ano_safra} • CONAB + USDA
          </span>
        </div>
        <div className="agro-safra-badges">
          <span className="agro-badge-laranja">🥈 2º Exportador Mundial</span>
          <span className="agro-badge-verde">📈 +{indicadores.crescimento_area_pct}% área vs safra ant.</span>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="agro-safra-kpis">
        <div className="agro-safra-kpi cor-laranja">
          <div className="agro-safra-kpi-icon">🌾</div>
          <div className="agro-safra-kpi-valor">
            {safra_br.indice_colheita_pct}%
          </div>
          <div className="agro-safra-kpi-label">Área Colhida BR</div>
          <div className="agro-safra-kpi-sub">{calendario.colheita_pico}</div>
        </div>

        <div className="agro-safra-kpi cor-amarelo">
          <div className="agro-safra-kpi-icon">📦</div>
          <div className="agro-safra-kpi-valor">
            {safra_br.producao_pluma_mil_ton.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
          <div className="agro-safra-kpi-label">Prod. Pluma (mil ton)</div>
          <div className="agro-safra-kpi-sub agro-positivo">▲ {safra_br.variacao_producao_pct}% vs ant.</div>
        </div>

        <div className="agro-safra-kpi cor-verde">
          <div className="agro-safra-kpi-icon">🌍</div>
          <div className="agro-safra-kpi-valor">
            {indicadores.participacao_mundial_producao_pct}%
          </div>
          <div className="agro-safra-kpi-label">Part. Produção Mundial</div>
          <div className="agro-safra-kpi-sub">{indicadores.participacao_mundial_exportacao_pct}% exp. mundial</div>
        </div>

        <div className="agro-safra-kpi cor-azul">
          <div className="agro-safra-kpi-icon">📏</div>
          <div className="agro-safra-kpi-valor">
            {safra_br.produtividade_kg_ha.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
          <div className="agro-safra-kpi-label">Produtividade (kg/ha)</div>
          <div className="agro-safra-kpi-sub agro-positivo">{indicadores.produtividade_vs_media_historica} hist.</div>
        </div>

        <div className="agro-safra-kpi cor-roxo">
          <div className="agro-safra-kpi-icon">🚢</div>
          <div className="agro-safra-kpi-valor">
            {safra_br.exportacao_prevista_mil_ton.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
          <div className="agro-safra-kpi-label">Exportação Prev. (mil ton)</div>
          <div className="agro-safra-kpi-sub">vs cons. {safra_br.consumo_interno_mil_ton} mil ton</div>
        </div>

        <div className="agro-safra-kpi cor-cinza">
          <div className="agro-safra-kpi-icon">🗄️</div>
          <div className="agro-safra-kpi-valor">
            {safra_br.relacao_estoque_consumo_pct.toFixed(0)}%
          </div>
          <div className="agro-safra-kpi-label">Estoque/Consumo BR</div>
          <div className="agro-safra-kpi-sub">mundial: {safra_mundial.relacao_estoque_consumo_pct}%</div>
        </div>
      </div>

      {/* Progresso de Colheita */}
      <div className="agro-safra-progresso">
        <div className="agro-safra-progresso-titulo">📊 Progresso da Safra 2025/26</div>
        <div className="agro-safra-progresso-bars">
          <ProgressBar value={safra_br.indice_plantio_pct} cor="#4ade80" label="🌱 Plantio Concluído" />
          <ProgressBar value={safra_br.indice_maturacao_pct} cor="#fbbf24" label="🌿 Maturação" />
          <ProgressBar value={safra_br.indice_colheita_pct} cor="#fb923c" label="🌾 Colheita em Andamento" />
        </div>

        {/* Por Estado */}
        <div className="agro-estados-grid">
          {safra_br.estados.map((e: any) => (
            <div key={e.uf} className="agro-estado-item">
              <div className="agro-estado-header">
                <span className="agro-estado-uf">{e.uf}</span>
                <span className="agro-estado-colhido">{e.colhido_pct}% colhido</span>
              </div>
              <div className="agro-progress-track" style={{ marginBottom: 4 }}>
                <div
                  className="agro-progress-fill"
                  style={{
                    width: `${e.colhido_pct}%`,
                    background: e.colhido_pct >= 90 ? '#4ade80' : e.colhido_pct >= 75 ? '#fbbf24' : '#fb923c'
                  }}
                />
              </div>
              <div className="agro-estado-details">
                <span>{e.producao_mil_ton.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil ton</span>
                <span className="agro-estado-part">{e.participacao_pct}% BR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos Mundiais */}
      <div className="agro-safra-charts">
        {/* Produção Mundial */}
        <div className="agro-safra-chart-box">
          <div className="agro-chart-label">🌍 Produção Mundial (mil ton pluma)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={safra_mundial.maiores_produtores}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="producao"
                nameKey="pais"
              >
                {safra_mundial.maiores_produtores.map((_: any, i: number) => (
                  <Cell key={i} fill={CORES_PRODUTORES[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Exportação Mundial */}
        <div className="agro-safra-chart-box">
          <div className="agro-chart-label">🚢 Maiores Exportadores (mil ton)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={safra_mundial.maiores_exportadores}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="exportacao"
                nameKey="pais"
              >
                {safra_mundial.maiores_exportadores.map((_: any, i: number) => (
                  <Cell key={i} fill={CORES_EXPORTADORES[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Calendário */}
        <div className="agro-safra-chart-box agro-calendario-box">
          <div className="agro-chart-label">📅 Calendário Safra Brasil</div>
          <div className="agro-calendario-grid">
            <div className="agro-cal-item">
              <span className="agro-cal-icon">🌱</span>
              <div>
                <div className="agro-cal-label">Plantio</div>
                <div className="agro-cal-valor">{calendario.plantio_inicio} – {calendario.plantio_fim}</div>
              </div>
            </div>
            <div className="agro-cal-item">
              <span className="agro-cal-icon">🌾</span>
              <div>
                <div className="agro-cal-label">Colheita</div>
                <div className="agro-cal-valor">{calendario.colheita_inicio} – {calendario.colheita_fim}</div>
              </div>
            </div>
            <div className="agro-cal-item">
              <span className="agro-cal-icon">🔥</span>
              <div>
                <div className="agro-cal-label">Pico Colheita</div>
                <div className="agro-cal-valor">{calendario.colheita_pico}</div>
              </div>
            </div>
            <div className="agro-cal-item">
              <span className="agro-cal-icon">📍</span>
              <div>
                <div className="agro-cal-label">Região Principal</div>
                <div className="agro-cal-valor">{calendario.regiao_principal}</div>
              </div>
            </div>
            <div className="agro-cal-item agro-cal-full">
              <span className="agro-cal-icon">🧵</span>
              <div>
                <div className="agro-cal-label">Qualidade Fibra</div>
                <div className="agro-cal-valor">{indicadores.qualidade_fibra}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé de fontes */}
      <div className="agro-safra-fontes">
        📄 {data.referencia_boletim} &nbsp;|&nbsp; {data.referencia_usda}
        &nbsp;|&nbsp; Dados de: {new Date(data.atualizacao_dados).toLocaleDateString('pt-BR')}
        &nbsp;|&nbsp; {data.frequencia_atualizacao}
      </div>
    </div>
  );
}
