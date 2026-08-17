import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { StatusLiberacao, TipoFardo, Prisma } from '@prisma/client';

const criarSchema = z.object({
  instrucao: z.string().min(3),
  dataLiberacao: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dataColeta: z.string(),
  clienteId: z.number().int().positive(),
  origemId: z.number().int().positive(),
  destinoId: z.number().int().positive(),
  terminalId: z.number().int().positive(),
  localColetaId: z.number().int().positive(),
  freteEmpresa: z.number().positive(),
  totalFardos: z.number().int().positive(),
  tipoFardo: z.nativeEnum(TipoFardo).default(TipoFardo.FARDAO),
  deadline: z.string(),
  observacao: z.string().optional(),
});

export async function listar(req: AuthRequest, res: Response) {
  const {
    clienteId, origemId, terminalId, status,
    diasMaximos, page = '1', limit = '50',
    busca, diasMinimos,
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: Prisma.LiberacaoWhereInput = {};

  if (clienteId) where.clienteId = parseInt(clienteId);
  if (origemId) where.origemId = parseInt(origemId);
  if (terminalId) where.terminalId = parseInt(terminalId);
  if (status) where.status = status as StatusLiberacao;

  // Tratamento de datas para deadline
  const deadlineFilter: any = {};
  if (diasMaximos) {
    const dataMax = new Date();
    dataMax.setDate(dataMax.getDate() + parseInt(diasMaximos));
    deadlineFilter.lte = dataMax;
  }

  if (diasMinimos) {
    const dataMin = new Date();
    dataMin.setDate(dataMin.getDate() + parseInt(diasMinimos));
    deadlineFilter.gte = dataMin;
  }

  if (Object.keys(deadlineFilter).length > 0) {
    where.deadline = deadlineFilter;
  }

  if (busca) {
    where.OR = [
      { instrucao: { contains: busca } },
      { veiculos: { some: { placa: { contains: busca } } } },
      { veiculos: { some: { motoristaNome: { contains: busca } } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.liberacao.count({ where }),
    prisma.liberacao.findMany({
      where,
      skip,
      take,
      include: {
        cliente: { select: { id: true, nome: true } },
        origem: { select: { id: true, nome: true } },
        destino: { select: { id: true, nome: true } },
        terminal: { select: { id: true, nome: true } },
        localColeta: { select: { id: true, nome: true } },
        veiculos: {
          select: {
            id: true, placa: true, status: true, qtdFardos: true,
            motoristaNome: true, motoristaTelefone: true,
            modeloCarreta: { select: { id: true, nomeDescricao: true } },
          },
        },
      },
      orderBy: { deadline: 'asc' },
    }),
  ]);

  // Calcula saldo e dias para deadline
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const data = items.map((l) => {
    const carregado = l.veiculos.reduce((s, v) => s + v.qtdFardos, 0);
    const saldo = l.totalFardos - carregado;
    const deadlineDate = new Date(l.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diasParaDeadline = Math.ceil(
      (deadlineDate.getTime() - hoje.getTime()) / 86400000,
    );
    return { ...l, carregado, saldo, diasParaDeadline };
  });

  return res.json({ data, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const liberacao = await prisma.liberacao.findUnique({
    where: { id: parseInt(id) },
    include: {
      cliente: true,
      origem: true,
      destino: true,
      terminal: true,
      localColeta: true,
      veiculos: {
        include: {
          modeloCarreta: true,
          transportadora: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'NOT_FOUND');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(liberacao.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diasParaDeadline = Math.ceil(
    (deadlineDate.getTime() - hoje.getTime()) / 86400000,
  );
  
  const carregado = liberacao.veiculos.reduce((s, v) => s + v.qtdFardos, 0);

  return res.json({ 
    ...liberacao, 
    carregado, 
    saldo: liberacao.totalFardos - carregado, 
    diasParaDeadline 
  });
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  // Validar se instrução já existe
  const existe = await prisma.liberacao.findUnique({ where: { instrucao: data.instrucao } });
  if (existe) throw new AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');

  // Validar se cliente existe
  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) throw new AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');

  // Validar se origem existe
  const origem = await prisma.origem.findUnique({ where: { id: data.origemId } });
  if (!origem) throw new AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');

  // Validar se destino existe
  const destino = await prisma.destino.findUnique({ where: { id: data.destinoId } });
  if (!destino) throw new AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');

  // Validar se terminal existe
  const terminal = await prisma.terminal.findUnique({ where: { id: data.terminalId } });
  if (!terminal) throw new AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');

  // Validar se localColeta existe
  const localColeta = await prisma.localColeta.findUnique({ where: { id: data.localColetaId } });
  if (!localColeta) throw new AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');

  const liberacao = await prisma.liberacao.create({
    data: {
      ...data,
      dataLiberacao: new Date(data.dataLiberacao),
      dataColeta: new Date(data.dataColeta),
      deadline: new Date(data.deadline),
      freteEmpresa: data.freteEmpresa,
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
    },
  });

  return res.status(201).json(liberacao);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);

  // Validar se liberação existe
  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  // Validar se é uma instrução duplicada (se mudou a instrução)
  if (data.instrucao && data.instrucao !== liberacao.instrucao) {
    const existe = await prisma.liberacao.findUnique({ where: { instrucao: data.instrucao } });
    if (existe) throw new AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');
  }

  // Validar referências caso estejam sendo alteradas
  if (data.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');
  }

  if (data.origemId) {
    const origem = await prisma.origem.findUnique({ where: { id: data.origemId } });
    if (!origem) throw new AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');
  }

  if (data.destinoId) {
    const destino = await prisma.destino.findUnique({ where: { id: data.destinoId } });
    if (!destino) throw new AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');
  }

  if (data.terminalId) {
    const terminal = await prisma.terminal.findUnique({ where: { id: data.terminalId } });
    if (!terminal) throw new AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');
  }

  if (data.localColetaId) {
    const localColeta = await prisma.localColeta.findUnique({ where: { id: data.localColetaId } });
    if (!localColeta) throw new AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');
  }

  const liberacaoAtualizada = await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: {
      ...data,
      dataLiberacao: data.dataLiberacao ? new Date(data.dataLiberacao) : undefined,
      dataColeta: data.dataColeta ? new Date(data.dataColeta) : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
      localColeta: { select: { id: true, nome: true } },
    },
  });

  return res.json(liberacaoAtualizada);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: { status: StatusLiberacao.CANCELADA },
  });

  return res.json({ message: 'Liberação cancelada com sucesso' });
}

export async function atualizarStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  // Validar status
  if (!Object.values(StatusLiberacao).includes(status)) {
    throw new AppError(`Status inválido: ${status}`, 400, 'INVALID_STATUS');
  }

  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  const atualizada = await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: { status },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
      localColeta: { select: { id: true, nome: true } },
    },
  });

  return res.json(atualizada);
}
