// Tela inicial de cada perfil (GR e Visitante só têm uma tela).
export function telaInicial(perfil?: string) {
  if (perfil === 'GR') return '/gr';
  if (perfil === 'VISITANTE') return '/minha-posicao';
  return '/dashboard';
}
