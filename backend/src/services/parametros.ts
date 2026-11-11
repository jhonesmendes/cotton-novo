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
} as const;

export type ChaveParametro = keyof typeof PARAMETROS;

export async function lerParametro(chave: ChaveParametro, padrao: number = PARAMETROS[chave].padrao) {
  const registro = await prisma.configuracaoSistema.findUnique({ where: { chave } });
  const valor = registro ? Number(registro.valor) : NaN;
  return Number.isFinite(valor) ? valor : padrao;
}
