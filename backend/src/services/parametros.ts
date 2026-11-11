import prisma from '../database/prisma';

// Parâmetros numéricos ajustáveis na tela Revisão de Dados › Parâmetros.
// Cada um tem rótulo, unidade e limites — o backend só aceita chaves daqui.
export const PARAMETROS = {
  tolerancia_peso_fechamento: {
    rotulo: 'Tolerância de peso no fechamento',
    descricao: 'Diferença aceita entre a soma dos pesos dos veículos e o peso da instrução, em % do peso da instrução.',
    unidade: '%',
    padrao: 1,
    min: 0,
    max: 20,
  },
  meta_cumprimento: {
    rotulo: 'Meta da taxa de cumprimento',
    descricao: 'Linha de referência no card "Taxa de cumprimento" do Dashboard (fardos carregados ÷ total das liberações ativas).',
    unidade: '%',
    padrao: 85,
    min: 0,
    max: 100,
  },
} as const;

export type ChaveParametro = keyof typeof PARAMETROS;

export async function lerParametro(chave: ChaveParametro, padrao: number = PARAMETROS[chave].padrao) {
  const registro = await prisma.configuracaoSistema.findUnique({ where: { chave } });
  const valor = registro ? Number(registro.valor) : NaN;
  return Number.isFinite(valor) ? valor : padrao;
}
