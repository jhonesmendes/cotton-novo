// Última combinação de filtros usada na lista de Liberações — o botão "Voltar"
// do detalhe leva de volta pra ela (mesmo vindo da tela de edição).
const CHAVE = 'cotton:liberacoes:filtros';

export function salvarFiltrosLista(query: string) {
  try {
    sessionStorage.setItem(CHAVE, query);
  } catch {
    // sessionStorage indisponível (modo privado etc.) — o Voltar cai na lista padrão.
  }
}

export function urlListaLiberacoes() {
  try {
    const query = sessionStorage.getItem(CHAVE);
    return query ? `/liberacoes?${query}` : '/liberacoes';
  } catch {
    return '/liberacoes';
  }
}

// Lista em tabela ou em cards — preferência do navegador, vale entre sessões.
export type ModoVisualizacao = 'lista' | 'cards';
const CHAVE_MODO = 'cotton:liberacoes:modo';

export function lerModoVisualizacao(): ModoVisualizacao {
  try {
    return localStorage.getItem(CHAVE_MODO) === 'cards' ? 'cards' : 'lista';
  } catch {
    return 'lista';
  }
}

export function salvarModoVisualizacao(modo: ModoVisualizacao) {
  try {
    localStorage.setItem(CHAVE_MODO, modo);
  } catch {
    // localStorage indisponível — a escolha vale só enquanto a tela estiver aberta.
  }
}
