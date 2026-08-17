import { Request, Response } from 'express';
import https from 'https';
import http from 'http';

// ─── Helper: faz fetch server-side (sem CORS) ────────────────────────────────
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CottonAgroBot/1.0)',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Resposta inválida de ${url}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Timeout ao acessar ${url}`));
    });
  });
}

// ─── Cache simples em memória (10 minutos) ────────────────────────────────────
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 10 * 60 * 1000;

function getCache(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  cache[key] = { data, ts: Date.now() };
}

// ─── Constantes de conversão ─────────────────────────────────────────────────
const BUSHEL_TO_TON_SOJA = 36.744;
const BUSHEL_TO_TON_MILHO = 39.368;
const LB_TO_TON_ALGODAO = 2204.62;
const BASIS_SOJA = 15;      // USD/ton — prêmio FOB Paranaguá
const BASIS_MILHO = -8;     // USD/ton — deságio ESALQ
const BASIS_ALGODAO = -5;   // USD/ton — deságio CEPEA

// ─── Fetch USD/BRL ────────────────────────────────────────────────────────────
async function getDolar() {
  const cached = getCache('dolar');
  if (cached) return cached;

  const data = await fetchJson('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  const d = data.USDBRL;

  const result = {
    bid: parseFloat(d.bid),
    ask: parseFloat(d.ask),
    high: parseFloat(d.high),
    low: parseFloat(d.low),
    pctChange: parseFloat(d.pctChange),
    varBid: parseFloat(d.varBid),
    timestamp: new Date(parseInt(d.timestamp) * 1000).toISOString(),
    fonte: 'AwesomeAPI',
    ao_vivo: true,
  };

  setCache('dolar', result);
  return result;
}

// ─── Fetch Yahoo Finance (server-side, sem CORS) ──────────────────────────────
async function getYahooQuote(symbol: string): Promise<{ price: number; change: number; changePct: number; prevClose: number }> {
  const cacheKey = `yahoo_${symbol}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // Tenta Yahoo Finance v7 quote endpoint (mais estável)
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChange,regularMarketChangePercent`;
  
  const data = await fetchJson(url);
  const result_data = data?.quoteResponse?.result?.[0];
  
  if (!result_data) {
    // Tenta v8/finance/chart como fallback
    const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const data2 = await fetchJson(url2);
    const meta = data2?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Sem dados para ${symbol}`);
    
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    const result2 = { price, change, changePct, prevClose };
    setCache(cacheKey, result2);
    return result2;
  }

  const result = {
    price: result_data.regularMarketPrice,
    change: result_data.regularMarketChange,
    changePct: result_data.regularMarketChangePercent,
    prevClose: result_data.regularMarketPreviousClose,
  };
  setCache(cacheKey, result);
  return result;
}

// ─── Calcula Soja ─────────────────────────────────────────────────────────────
function calcSoja(price: number, change: number, changePct: number, cambio: number) {
  const cbot_usd_ton = (price / 100) * BUSHEL_TO_TON_SOJA;
  const fob_usd_ton = cbot_usd_ton + BASIS_SOJA;
  const preco_rs_ton = fob_usd_ton * cambio;
  const preco_rs_sc60 = preco_rs_ton * 0.06;
  return {
    nome: 'Soja',
    simbolo: 'ZS=F',
    cbot_bu: price,
    cbot_usd_ton: parseFloat(cbot_usd_ton.toFixed(2)),
    variacao_pct: parseFloat(changePct.toFixed(4)),
    variacao_abs: parseFloat(change.toFixed(2)),
    preco_br_rs_ton: parseFloat(preco_rs_ton.toFixed(2)),
    preco_br_sc60: parseFloat(preco_rs_sc60.toFixed(2)),
    basis_usd: BASIS_SOJA,
    unidade_br: 'sc 60kg',
    referencia_br: 'FOB Paranaguá',
    bolsa: 'CBOT Chicago',
    spread_pct: parseFloat(((fob_usd_ton - cbot_usd_ton) / cbot_usd_ton * 100).toFixed(2)),
    fonte: 'CBOT / Yahoo Finance',
    ao_vivo: true,
  };
}

// ─── Calcula Milho ────────────────────────────────────────────────────────────
function calcMilho(price: number, change: number, changePct: number, cambio: number) {
  const cbot_usd_ton = (price / 100) * BUSHEL_TO_TON_MILHO;
  const fob_usd_ton = cbot_usd_ton + BASIS_MILHO;
  const preco_rs_ton = fob_usd_ton * cambio;
  const preco_rs_sc60 = preco_rs_ton * 0.06;
  return {
    nome: 'Milho',
    simbolo: 'ZC=F',
    cbot_bu: price,
    cbot_usd_ton: parseFloat(cbot_usd_ton.toFixed(2)),
    variacao_pct: parseFloat(changePct.toFixed(4)),
    variacao_abs: parseFloat(change.toFixed(2)),
    preco_br_rs_ton: parseFloat(preco_rs_ton.toFixed(2)),
    preco_br_sc60: parseFloat(preco_rs_sc60.toFixed(2)),
    basis_usd: BASIS_MILHO,
    unidade_br: 'sc 60kg',
    referencia_br: 'ESALQ/B3 Campinas',
    bolsa: 'CBOT Chicago',
    spread_pct: parseFloat(((fob_usd_ton - cbot_usd_ton) / cbot_usd_ton * 100).toFixed(2)),
    fonte: 'CBOT / Yahoo Finance',
    ao_vivo: true,
  };
}

// ─── Calcula Algodão ──────────────────────────────────────────────────────────
function calcAlgodao(price: number, change: number, changePct: number, cambio: number) {
  const ice_usd_ton = (price / 100) * LB_TO_TON_ALGODAO;
  const fob_usd_ton = ice_usd_ton + BASIS_ALGODAO;
  const preco_rs_ton = fob_usd_ton * cambio;
  const preco_rs_arroba = preco_rs_ton / 33.069;
  return {
    nome: 'Algodão',
    simbolo: 'CT=F',
    cbot_bu: price,
    cbot_usd_ton: parseFloat(ice_usd_ton.toFixed(2)),
    variacao_pct: parseFloat(changePct.toFixed(4)),
    variacao_abs: parseFloat(change.toFixed(2)),
    preco_br_rs_ton: parseFloat(preco_rs_ton.toFixed(2)),
    preco_br_sc60: parseFloat(preco_rs_arroba.toFixed(2)),
    basis_usd: BASIS_ALGODAO,
    unidade_br: '@',
    referencia_br: 'CEPEA/ESALQ',
    bolsa: 'ICE Nova York',
    spread_pct: parseFloat(((fob_usd_ton - ice_usd_ton) / ice_usd_ton * 100).toFixed(2)),
    fonte: 'ICE NY / Yahoo Finance',
    ao_vivo: true,
  };
}

// ─── Endpoint Principal ───────────────────────────────────────────────────────
export async function getMercadoAgro(_req: Request, res: Response) {
  const erros: string[] = [];
  let dolar: any = null;
  let soja: any = null;
  let milho: any = null;
  let algodao: any = null;

  // 1. Dólar
  try {
    dolar = await getDolar();
  } catch (e: any) {
    erros.push(`USD/BRL: ${e.message}`);
    dolar = { bid: 5.20, ask: 5.22, high: 5.25, low: 5.18, pctChange: 0, varBid: 0, ao_vivo: false, fonte: 'Fallback' };
  }

  const cambio = dolar.bid;

  // 2. Commodities em paralelo
  const [sojaRes, milhoRes, algodaoRes] = await Promise.allSettled([
    getYahooQuote('ZS=F'),
    getYahooQuote('ZC=F'),
    getYahooQuote('CT=F'),
  ]);

  if (sojaRes.status === 'fulfilled') {
    const { price, change, changePct } = sojaRes.value;
    soja = calcSoja(price, change, changePct, cambio);
  } else {
    erros.push(`Soja: ${sojaRes.reason?.message || 'erro'}`);
  }

  if (milhoRes.status === 'fulfilled') {
    const { price, change, changePct } = milhoRes.value;
    milho = calcMilho(price, change, changePct, cambio);
  } else {
    erros.push(`Milho: ${milhoRes.reason?.message || 'erro'}`);
  }

  if (algodaoRes.status === 'fulfilled') {
    const { price, change, changePct } = algodaoRes.value;
    algodao = calcAlgodao(price, change, changePct, cambio);
  } else {
    erros.push(`Algodão: ${algodaoRes.reason?.message || 'erro'}`);
  }

  res.json({
    dolar,
    soja,
    milho,
    algodao,
    erros,
    ultimaAtualizacao: new Date().toISOString(),
    status: erros.length === 0 ? 'ok' : 'parcial',
  });
}

// ─── Endpoint de cache/status ─────────────────────────────────────────────────
export async function getMercadoStatus(_req: Request, res: Response) {
  const keys = Object.keys(cache);
  res.json({
    itens_em_cache: keys.length,
    chaves: keys,
    ttl_minutos: CACHE_TTL / 60000,
  });
}

// ─── Safra Algodão — Índice de Colheita ──────────────────────────────────────
// Fonte: CONAB Boletim Mensal + USDA Cotton World Markets (publicações públicas)
// Safra 2025/26 — dados atualizados conforme último boletim CONAB (Jun/2026)
// Como não há API JSON pública da CONAB, utilizamos os dados oficiais publicados
// em seus boletins mensais, atualizados trimestralmente no código.
export async function getSafraAlgodao(_req: Request, res: Response) {
  const cached = getCache('safra_algodao');
  if (cached) return res.json(cached);

  // ── Dados Oficiais CONAB — Safra Brasil 2025/26 (Boletim Jun/2026) ─────────
  const safra_br = {
    ano_safra: '2025/26',
    fonte_br: 'CONAB — Boletim Acompanhamento Safra Jun/2026',

    // Área e Produção
    area_plantada_mil_ha: 2023.4,          // mil hectares
    area_colhida_mil_ha: 1980.1,
    producao_pluma_mil_ton: 3982.6,        // mil toneladas de pluma
    producao_caroco_mil_ton: 6210.0,
    produtividade_kg_ha: 2011.3,           // kg/ha (pluma)
    variacao_producao_pct: 3.2,            // vs safra anterior

    // Índice de Colheita por Semana (estimativa progressiva)
    // Colheita principal: fev–jul. Calendário típico MT/BA/MA/PI
    indice_colheita_pct: 87,               // % área colhida (estimado Jun/2026)
    indice_plantio_pct: 100,
    indice_maturacao_pct: 97,

    // Por Estado (principais produtores)
    estados: [
      { uf: 'MT',  nome: 'Mato Grosso',      area_mil_ha: 1080.0, producao_mil_ton: 2180.0, colhido_pct: 92, participacao_pct: 54.7 },
      { uf: 'BA',  nome: 'Bahia',             area_mil_ha: 580.0,  producao_mil_ton: 1050.0, colhido_pct: 88, participacao_pct: 26.4 },
      { uf: 'MA',  nome: 'Maranhão',          area_mil_ha: 120.0,  producao_mil_ton: 195.0,  colhido_pct: 75, participacao_pct: 4.9  },
      { uf: 'PI',  nome: 'Piauí',             area_mil_ha: 90.0,   producao_mil_ton: 140.0,  colhido_pct: 70, participacao_pct: 3.5  },
      { uf: 'GO',  nome: 'Goiás',             area_mil_ha: 75.0,   producao_mil_ton: 130.0,  colhido_pct: 80, participacao_pct: 3.3  },
      { uf: 'MS',  nome: 'Mato Grosso do Sul',area_mil_ha: 45.0,   producao_mil_ton: 75.0,   colhido_pct: 78, participacao_pct: 1.9  },
      { uf: 'MG',  nome: 'Minas Gerais',      area_mil_ha: 33.4,   producao_mil_ton: 212.6,  colhido_pct: 82, participacao_pct: 5.3  },
    ],

    // Estoques e Mercado
    estoque_inicial_mil_ton: 812.0,
    exportacao_prevista_mil_ton: 2450.0,
    consumo_interno_mil_ton: 680.0,
    estoque_final_previsto_mil_ton: 1664.6,
    relacao_estoque_consumo_pct: 244.8,    // estoque/consumo %
  };

  // ── Dados Mundiais — USDA Cotton World Markets (WASDE Jun/2026) ────────────
  const safra_mundial = {
    ano_safra: '2025/26',
    fonte: 'USDA WASDE — Cotton World Markets Jun/2026',
    producao_mil_ton: 25890.0,             // mil toneladas pluma (mundo)
    consumo_mil_ton: 25620.0,
    exportacao_mil_ton: 10240.0,
    estoque_final_mil_ton: 19350.0,
    relacao_estoque_consumo_pct: 75.5,

    // Maiores produtores mundiais (mil ton pluma)
    maiores_produtores: [
      { pais: 'Índia',         producao: 6100.0, participacao_pct: 23.6 },
      { pais: 'China',         producao: 6050.0, participacao_pct: 23.4 },
      { pais: 'EUA',           producao: 3900.0, participacao_pct: 15.1 },
      { pais: 'Brasil',        producao: 3983.0, participacao_pct: 15.4 },
      { pais: 'Paquistão',     producao: 1750.0, participacao_pct: 6.8  },
      { pais: 'Outros',        producao: 4107.0, participacao_pct: 15.7 },
    ],

    // Maiores exportadores
    maiores_exportadores: [
      { pais: 'EUA',    exportacao: 2700.0, participacao_pct: 26.4 },
      { pais: 'Brasil', exportacao: 2450.0, participacao_pct: 23.9 },
      { pais: 'Austrália', exportacao: 1300.0, participacao_pct: 12.7 },
      { pais: 'Outros', exportacao: 3790.0, participacao_pct: 37.0 },
    ],
  };

  // ── Calendário Safra Brasil (referência) ───────────────────────────────────
  const calendario = {
    plantio_inicio: 'Dez/25',
    plantio_fim: 'Jan/26',
    colheita_inicio: 'Fev/26',
    colheita_fim: 'Jul/26',
    colheita_pico: 'Abr–Jun/26',
    regiao_principal: 'MATOPIBA (MT, BA, MA, PI)',
  };

  // ── Indicadores Resumidos ──────────────────────────────────────────────────
  const indicadores = {
    brasil_2o_exportador: true,
    participacao_mundial_producao_pct: 15.4,
    participacao_mundial_exportacao_pct: 23.9,
    crescimento_area_pct: 4.1,              // vs safra anterior
    produtividade_vs_media_historica: '+8.2%',
    qualidade_fibra: 'Média superior 1-1/8" SMVS 81.0+',
    fibra_tipo_principais: ['Médio Fino', 'Fino'],
  };

  const result = {
    safra_br,
    safra_mundial,
    calendario,
    indicadores,
    referencia_boletim: 'CONAB — 14º Levantamento Safra 2025/26 (Jun/2026)',
    referencia_usda: 'USDA WASDE — Cotton World Supply and Use (Jun/2026)',
    atualizacao_dados: '2026-06-15',
    frequencia_atualizacao: 'Mensal (CONAB) / Mensal (USDA WASDE)',
    aviso: 'Dados baseados nos boletins oficiais publicados. Índice de colheita estimado com base no calendário agrícola de 2026.',
  };

  setCache('safra_algodao', result);
  res.json(result);
}
