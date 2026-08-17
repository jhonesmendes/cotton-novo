import { useMercadoAgro } from '@/services/useMercadoAgro';
import DolarCard from './components/DolarCard';
import CommodityCard from './components/CommodityCard';
import ComparativoChart from './components/ComparativoChart';
import ParametrosCard from './components/ParametrosCard';
import SafraAlgodaoCard from './components/SafraAlgodaoCard';
import './agro.css';

export default function AgroPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMercadoAgro();

  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const horaFormatada = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="agro-root">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="agro-header">
        <div className="agro-header-left">
          <div className="agro-logo-area">
            <span className="agro-logo-icon">🌿</span>
            <div>
              <h1 className="agro-titulo">PAINEL DO AGRO IA</h1>
              <p className="agro-subtitulo">Mercado Agrícola Brasileiro</p>
            </div>
          </div>
        </div>

        <div className="agro-header-right">
          {isError && (
            <div className="agro-error-badge" title={String(error)}>
              ⚠️ Erro ao carregar dados
            </div>
          )}
          <div className="agro-data-badge">
            {isFetching && <span className="agro-pulse-dot small" />}
            ✅ Dados de {dataFormatada} • {horaFormatada}
          </div>
          <div className="agro-fonte-badge">
            AwesomeAPI + Yahoo Finance
          </div>
          <button
            className="agro-refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Atualizar dados"
          >
            {isFetching ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
      </header>

      {/* ─── Erros parciais ─────────────────────────────────────── */}
      {data?.erros && data.erros.length > 0 && (
        <div className="agro-erros-bar">
          ⚠️ Alguns dados não puderam ser carregados: {data.erros.join(' | ')}
          &nbsp;— Verifique a conexão ou tente novamente.
        </div>
      )}

      {/* ─── Corpo Principal ────────────────────────────────────── */}
      <main className="agro-main">

        {/* Dólar — linha toda */}
        <section className="agro-dolar-section">
          <DolarCard data={data?.dolar ?? null} loading={isLoading} />
        </section>

        {/* Commodities — 3 colunas */}
        <section className="agro-commodities-section">
          <CommodityCard
            data={data?.soja ?? null}
            loading={isLoading}
            emoji="🌱"
            cor="verde"
          />
          <CommodityCard
            data={data?.milho ?? null}
            loading={isLoading}
            emoji="🌽"
            cor="amarelo"
          />
          <CommodityCard
            data={data?.algodao ?? null}
            loading={isLoading}
            emoji="🏮"
            cor="laranja"
          />
        </section>

        {/* Comparativo BR × Internacional */}
        {data && !isLoading && (
          <section className="agro-comparativo-wrapper">
            <ComparativoChart dados={data} />
          </section>
        )}

        {/* Índice de Colheita — Algodão */}
        <section className="agro-safra-wrapper">
          <SafraAlgodaoCard />
        </section>

        {/* Parâmetros e Relação de Troca */}
        {data && !isLoading && (
          <section className="agro-parametros-wrapper">
            <ParametrosCard dados={data} />
          </section>
        )}

        {/* Aviso de fonte */}
        <footer className="agro-footer">
          <p>
            ⚠️ <strong>Aviso:</strong> Preços internos brasileiros são <em>estimativas calculadas</em> com base em
            CBOT/ICE + câmbio USD/BRL + basis de mercado. Dados internacionais via Yahoo Finance (não-oficial,
            uso educacional). Para decisões comerciais, consulte corretoras especializadas.
          </p>
          <p>
            Fontes: AwesomeAPI (USD/BRL) • Yahoo Finance (CBOT ZS=F, ZC=F, ICE CT=F) •
            Última atualização: {data?.ultimaAtualizacao?.toLocaleTimeString('pt-BR') ?? '—'}
          </p>
        </footer>
      </main>
    </div>
  );
}
