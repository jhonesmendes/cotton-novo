// Significado dos números de carga — usado nas dicas (passar o mouse) em todas as telas,
// para o mesmo termo ter sempre a mesma explicação.
export type TermoCarga = 'TOTAL' | 'PROGRAMADO' | 'CARREGADO' | 'A_PROGRAMAR' | 'A_CARREGAR' | 'PESO' | 'VENCIDAS';

export const GLOSSARIO: Record<TermoCarga, { rotulo: string; simples?: string; explicacao: string }> = {
  TOTAL: { rotulo: 'Total', explicacao: 'Soma do total de fardos das liberações.' },
  PROGRAMADO: { rotulo: 'Programado', simples: 'Com caminhão', explicacao: 'Fardos que já têm caminhão, em qualquer etapa (de Aguardando GR a Finalizado).' },
  CARREGADO: { rotulo: 'Carregado', simples: 'Manifestado', explicacao: 'Fardos de caminhões de Manifestado em diante — a carga já saiu.' },
  A_PROGRAMAR: { rotulo: 'A programar', simples: 'Sem caminhão', explicacao: 'Total − programado: fardos que ainda não têm caminhão.' },
  A_CARREGAR: { rotulo: 'A carregar', simples: 'Falta manifestar', explicacao: 'Total − carregado: fardos que ainda não saíram, com ou sem caminhão.' },
  PESO: { rotulo: 'Peso', explicacao: 'Soma do peso das instruções. O * indica que há liberações sem peso informado.' },
  VENCIDAS: { rotulo: 'Vencidas', explicacao: 'Liberações ativas com deadline passado e ainda com fardo a carregar.' },
};
