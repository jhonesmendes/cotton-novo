import { StatusLiberacao } from '@prisma/client';
import prisma from '../database/prisma';
import { ORDEM_STATUS_VEICULO } from './liberacao-status';

// Tela "Posição de caminhões" do cliente (link temporário ou Visitante).
// Só dados que o cliente pode ver: nunca frete motorista, margem, motorista nem dado interno.
// Frete empresa (R$/t) é visível (decisão D29).
export async function posicaoDoCliente(clienteId: number) {
  const [cliente, liberacoes] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, nome: true } }),
    prisma.liberacao.findMany({
      where: { clienteId, status: StatusLiberacao.ATIVA },
      select: {
        id: true, instrucao: true, tipoFardo: true, freteEmpresa: true, totalFardos: true, deadline: true,
        origemNome: true, terminal: { select: { nome: true } },
        localColetaNome: true, localColeta: { select: { nome: true } },
        destinoNome: true, destino: { select: { nome: true } },
        localEntregaNome: true, localEntrega: { select: { nome: true } },
        veiculos: { where: { ativo: true }, select: { status: true } },
      },
      orderBy: { deadline: 'asc' },
    }),
  ]);

  const zerado = () => Object.fromEntries(ORDEM_STATUS_VEICULO.map((s) => [s, 0])) as Record<string, number>;
  const totaisPorEtapa = zerado();
  const linhas = liberacoes.map((l) => {
    const porEtapa = zerado();
    for (const v of l.veiculos) {
      porEtapa[v.status] += 1;
      totaisPorEtapa[v.status] += 1;
    }
    return {
      instrucao: l.instrucao,
      origem: l.origemNome ?? l.terminal?.nome ?? null,
      localColeta: l.localColetaNome ?? l.localColeta?.nome ?? null,
      destino: l.destinoNome ?? l.destino?.nome ?? null,
      localEntrega: l.localEntregaNome ?? l.localEntrega?.nome ?? null,
      tipoFardo: l.tipoFardo,
      freteEmpresa: l.freteEmpresa,
      totalFardos: l.totalFardos,
      veiculos: l.veiculos.length,
      porEtapa,
    };
  });

  return {
    cliente,
    atualizadoEm: new Date(),
    etapas: ORDEM_STATUS_VEICULO,
    totalAtivo: linhas.reduce((s, l) => s + l.veiculos, 0),
    instrucoes: linhas.length,
    totaisPorEtapa,
    linhas,
  };
}
