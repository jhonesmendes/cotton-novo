/**
 * Serviço de dados de mercado agrícola
 * 
 * Arquitetura: Frontend → Backend Node.js (proxy) → APIs externas
 * Isso elimina problemas de CORS, pois o backend faz as chamadas server-side.
 * 
 * Endpoints consumidos pelo backend:
 *  - USD/BRL: AwesomeAPI (economia.awesomeapi.com.br)
 *  - CBOT/ICE: Yahoo Finance (query1.finance.yahoo.com)
 */

import api from './api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CotacaoDolar {
  bid: number;
  ask: number;
  high: number;
  low: number;
  pctChange: number;
  varBid: number;
  timestamp?: string;
  ao_vivo: boolean;
  fonte: string;
}

export interface CotacaoCommodity {
  nome: string;
  simbolo: string;
  // Internacional
  cbot_bu: number;
  cbot_usd_ton: number;
  variacao_pct: number;
  variacao_abs: number;
  bolsa: string;
  // Brasil (calculado)
  preco_br_rs_ton: number;
  preco_br_sc60: number;
  basis_usd: number;
  spread_pct: number;
  // Metadados
  unidade_br: string;
  referencia_br: string;
  fonte: string;
  ao_vivo: boolean;
}

export interface DadosMercado {
  dolar: CotacaoDolar | null;
  soja: CotacaoCommodity | null;
  milho: CotacaoCommodity | null;
  algodao: CotacaoCommodity | null;
  ultimaAtualizacao: Date;
  erros: string[];
  status: 'ok' | 'parcial' | 'erro';
}

// ─── Fetch via backend proxy (sem CORS) ───────────────────────────────────────
export async function fetchDadosMercado(): Promise<DadosMercado> {
  const res = await api.get('/mercado/agro');
  const raw = res.data;

  return {
    dolar: raw.dolar ?? null,
    soja: raw.soja ?? null,
    milho: raw.milho ?? null,
    algodao: raw.algodao ?? null,
    ultimaAtualizacao: new Date(raw.ultimaAtualizacao ?? Date.now()),
    erros: raw.erros ?? [],
    status: raw.status ?? 'ok',
  };
}
