import { StatusLiberacao, StatusVeiculo } from '@prisma/client';
import prisma from '../database/prisma';

const LIMPAR_FECHAMENTO_MANUAL = {
  fechamentoManual: false,
  fardosPendentesFechamento: null,
  motivoFechamento: null,
  fechamentoManualPor: null,
  fechamentoManualEm: null,
};

// Situação da liberação para a regra de conclusão.
export function situacaoFechamento(
  liberacao: { status: StatusLiberacao; totalFardos: number },
  veiculos: { status: StatusVeiculo; qtdFardos: number }[],
) {
  const carregado = veiculos.reduce((s, v) => s + v.qtdFardos, 0);
  const saldo = liberacao.totalFardos - carregado;
  const todosFinalizados = veiculos.length > 0 && veiculos.every((v) => v.status === StatusVeiculo.FINALIZADO);
  return {
    saldo,
    todosFinalizados,
    // Todos os veículos finalizados, mas ainda há fardos a carregar: não conclui
    // sozinha — fica ativa até carregar o resto ou um ADMIN fechar manualmente.
    aguardandoFechamento: liberacao.status === StatusLiberacao.ATIVA && todosFinalizados && saldo > 0,
  };
}

// Regra de conclusão automática: conclui só com todos os veículos FINALIZADO
// **e** sem saldo de fardos pendente. Reabre se algum veículo sair de FINALIZADO.
export async function reavaliarStatusLiberacao(liberacaoId: number) {
  const liberacao = await prisma.liberacao.findUnique({
    where: { id: liberacaoId },
    select: { status: true, totalFardos: true, fechamentoManual: true, fardosPendentesFechamento: true },
  });
  if (!liberacao || liberacao.status === StatusLiberacao.CANCELADA) return;

  const veiculos = await prisma.veiculo.findMany({ where: { liberacaoId }, select: { status: true, qtdFardos: true } });
  const { saldo, todosFinalizados } = situacaoFechamento(liberacao, veiculos);

  if (todosFinalizados && saldo <= 0) {
    if (liberacao.status !== StatusLiberacao.CONCLUIDA || liberacao.fechamentoManual) {
      await prisma.liberacao.update({
        where: { id: liberacaoId },
        data: { status: StatusLiberacao.CONCLUIDA, ...LIMPAR_FECHAMENTO_MANUAL },
      });
    }
    return;
  }

  if (todosFinalizados && liberacao.status === StatusLiberacao.CONCLUIDA && liberacao.fechamentoManual) {
    // Fechada manualmente pelo ADMIN: continua concluída, só mantém o pendente em dia.
    if (liberacao.fardosPendentesFechamento !== saldo) {
      await prisma.liberacao.update({ where: { id: liberacaoId }, data: { fardosPendentesFechamento: saldo } });
    }
    return;
  }

  if (liberacao.status === StatusLiberacao.CONCLUIDA) {
    await prisma.liberacao.update({
      where: { id: liberacaoId },
      data: { status: StatusLiberacao.ATIVA, ...LIMPAR_FECHAMENTO_MANUAL },
    });
  }
}
