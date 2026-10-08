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
