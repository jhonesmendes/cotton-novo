import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { StatusLiberacao, StatusVeiculo } from '@prisma/client';

const criarSchema = z.object({
  liberacaoId: z.number().int().positive(),
  placa: z.string().min(5).max(10),
  // Cadastro Base é o cadastro mestre; o veículo pode ser criado pela Liberação.
  modeloCarretaId: z.number().int().positive().optional(),
  nomeDescricao: z.string().min(3).optional(),
  capacidadeMaximaFardos: z.number().int().positive().optional(),
  pesoMaximoKg: z.number().int().positive().optional(),
  comprimentoM: z.number().positive().optional().nullable(),
  freteMotorista: z.number().positive(),
  qtdFardos: z.number().int().positive(),
  motoristaNome: z.string().min(3),
  motoristaTelefone: z.string().min(10),
  // Há cadastros legados com CPF incompleto; não devem impedir a edição do veículo.
  motoristaCpf: z.string().min(10).max(11).nullable().optional(),
  motoristaEmail: z.string().email().optional(),
  transportadoraId: z.number().int().positive().optional(),
  status: z.nativeEnum(StatusVeiculo).optional().default(StatusVeiculo.AGENDADO),
  dataAgendamento: z.string().datetime({ offset: true }).optional().nullable(),
  dataCarregamento: z.string().datetime({ offset: true }).optional().nullable(),
  dataDescarga: z.string().datetime({ offset: true }).optional().nullable(),
  observacao: z.string().optional(),
});

type DadosVeiculo = z.infer<typeof criarSchema>;

async function vincularCadastroBase(data: DadosVeiculo) {
  const placaVeiculo = data.placa.trim().toUpperCase();
  const dadosCadastro = {
    placaVeiculo,
    motoristaNome: data.motoristaNome,
    motoristaTelefone: data.motoristaTelefone,
    nomeDescricao: data.nomeDescricao,
    capacidadeMaximaFardos: data.capacidadeMaximaFardos,
    pesoMaximoKg: data.pesoMaximoKg,
    comprimentoM: data.comprimentoM ?? undefined,
  };
  let cadastro = data.modeloCarretaId
    ? await prisma.modeloCarreta.findUnique({ where: { id: data.modeloCarretaId } })
    : await prisma.modeloCarreta.findFirst({ where: { placaVeiculo } });

  if (cadastro) {
    cadastro = await prisma.modeloCarreta.update({
      where: { id: cadastro.id },
      data: {
        ...dadosCadastro,
        nomeDescricao: dadosCadastro.nomeDescricao ?? cadastro.nomeDescricao,
        capacidadeMaximaFardos: dadosCadastro.capacidadeMaximaFardos ?? cadastro.capacidadeMaximaFardos,
        pesoMaximoKg: dadosCadastro.pesoMaximoKg ?? cadastro.pesoMaximoKg,
      },
    });
  } else {
    if (!data.nomeDescricao) {
      throw new AppError('Informe o modelo da carreta para cadastrar um novo veículo', 400);
    }
    cadastro = await prisma.modeloCarreta.create({
      data: {
        ...dadosCadastro,
        nomeDescricao: data.nomeDescricao,
        capacidadeMaximaFardos: data.capacidadeMaximaFardos ?? 0,
        pesoMaximoKg: data.pesoMaximoKg ?? 0,
      },
    });
  }
  return { cadastro, placaVeiculo };
}

async function propagarCadastroBase(cadastro: { id: number; placaVeiculo: string | null; motoristaNome: string | null; motoristaTelefone: string | null }) {
  await prisma.veiculo.updateMany({
    where: { modeloCarretaId: cadastro.id },
    data: {
      ...(cadastro.placaVeiculo ? { placa: cadastro.placaVeiculo } : {}),
      ...(cadastro.motoristaNome ? { motoristaNome: cadastro.motoristaNome } : {}),
      ...(cadastro.motoristaTelefone ? { motoristaTelefone: cadastro.motoristaTelefone } : {}),
    },
  });
}

export async function listar(req: AuthRequest, res: Response) {
  const { 
    liberacaoId, status, placa, motorista,
    page = '1', limit = '100'
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (liberacaoId) where.liberacaoId = parseInt(liberacaoId);
  if (status) where.status = status as StatusVeiculo;
  if (placa) where.placa = { contains: placa };
  if (motorista) {
    where.OR = [
      { motoristaNome: { contains: motorista } },
      { motoristaTelefone: { contains: motorista } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.veiculo.count({ where }),
    prisma.veiculo.findMany({
      where,
      skip,
      take,
      include: {
        liberacao: {
          select: {
            id: true,
            instrucao: true,
            deadline: true,
            totalFardos: true,
            carregado: true,
            cliente: { select: { id: true, nome: true } },
            origem: { select: { id: true, nome: true } },
            terminal: { select: { id: true, nome: true } },
          },
        },
        modeloCarreta: true,
        transportadora: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const veiculo = await prisma.veiculo.findUnique({
    where: { id: parseInt(id) },
    include: {
      liberacao: {
        include: {
          cliente: true,
          origem: true,
          terminal: true,
        },
      },
      modeloCarreta: true,
      transportadora: true,
    },
  });

  if (!veiculo) throw new AppError('Veículo não encontrado', 404);
  return res.json(veiculo);
}

export async function buscarPorPlaca(req: AuthRequest, res: Response) {
  const { placa } = req.params;
  const placaVeiculo = placa.trim().toUpperCase();

  const cadastro = await prisma.modeloCarreta.findFirst({ where: { placaVeiculo } });
  if (cadastro) {
    return res.json({
      modeloCarretaId: cadastro.id,
      nomeDescricao: cadastro.nomeDescricao,
      capacidadeMaximaFardos: cadastro.capacidadeMaximaFardos,
      pesoMaximoKg: cadastro.pesoMaximoKg,
      comprimentoM: cadastro.comprimentoM,
      motoristaNome: cadastro.motoristaNome,
      motoristaTelefone: cadastro.motoristaTelefone,
    });
  }

  const veiculo = await prisma.veiculo.findFirst({
    where: { placa: placaVeiculo },
    orderBy: { createdAt: 'desc' },
    include: { modeloCarreta: true },
  });

  if (!veiculo) return res.json(null); // Retorna null se não encontrar, sem erro 404 para não poluir o console

  return res.json({
    modeloCarretaId: veiculo.modeloCarretaId,
    nomeDescricao: veiculo.modeloCarreta.nomeDescricao,
    capacidadeMaximaFardos: veiculo.modeloCarreta.capacidadeMaximaFardos,
    pesoMaximoKg: veiculo.modeloCarreta.pesoMaximoKg,
    comprimentoM: veiculo.modeloCarreta.comprimentoM,
    motoristaNome: veiculo.motoristaNome,
    motoristaTelefone: veiculo.motoristaTelefone,
    motoristaCpf: veiculo.motoristaCpf,
  });
}

export async function buscarMotoristaPorCpf(req: AuthRequest, res: Response) {
  const cpf = req.params.cpf.replace(/\D/g, '');
  const veiculo = await prisma.veiculo.findFirst({
    where: { motoristaCpf: cpf },
    orderBy: { updatedAt: 'desc' },
    select: { motoristaNome: true, motoristaTelefone: true, motoristaCpf: true },
  });
  return res.json(veiculo);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  const liberacao = await prisma.liberacao.findUnique({ where: { id: data.liberacaoId } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404);

  const { cadastro, placaVeiculo } = await vincularCadastroBase(data);
  const { nomeDescricao, capacidadeMaximaFardos, pesoMaximoKg, comprimentoM, ...dadosOperacionais } = data;
  const veiculo = await prisma.veiculo.create({
    data: {
      ...dadosOperacionais,
      placa: placaVeiculo,
      modeloCarretaId: cadastro.id,
      motoristaCpf: data.motoristaCpf ?? null,
      dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : null,
      dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : null,
      dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : null,
    },
    include: { modeloCarreta: true },
  });

  // Atualiza total carregado na liberação
  await recalcularCarregado(data.liberacaoId);

  return res.status(201).json(veiculo);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);
  const atual = await prisma.veiculo.findUnique({ where: { id: parseInt(id) } });
  if (!atual) throw new AppError('Veículo não encontrado', 404);
  const dadosCompletos = { ...atual, ...data, placa: data.placa ?? atual.placa } as DadosVeiculo;
  const { cadastro, placaVeiculo } = await vincularCadastroBase({
    ...dadosCompletos,
    modeloCarretaId: data.modeloCarretaId ?? atual.modeloCarretaId,
  });
  await propagarCadastroBase(cadastro);
  const { nomeDescricao, capacidadeMaximaFardos, pesoMaximoKg, comprimentoM, ...dadosOperacionais } = data;

  const veiculo = await prisma.veiculo.update({
    where: { id: parseInt(id) },
    data: {
      ...dadosOperacionais,
      placa: placaVeiculo,
      modeloCarretaId: cadastro.id,
      dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : undefined,
      dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : undefined,
      dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : undefined,
    },
    include: { modeloCarreta: true },
  });

  await recalcularCarregado(veiculo.liberacaoId);

  return res.json(veiculo);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const veiculo = await prisma.veiculo.findUnique({ where: { id: parseInt(id) } });
  if (!veiculo) throw new AppError('Veículo não encontrado', 404);

  await prisma.veiculo.delete({ where: { id: parseInt(id) } });
  await recalcularCarregado(veiculo.liberacaoId);

  return res.json({ message: 'Veículo removido' });
}

async function recalcularCarregado(liberacaoId: number) {
  const soma = await prisma.veiculo.aggregate({
    where: { liberacaoId },
    _sum: { qtdFardos: true },
  });
  const carregado = soma._sum.qtdFardos ?? 0;

  await prisma.liberacao.update({
    where: { id: liberacaoId },
    data: { carregado },
  });

  await atualizarStatusLiberacao(liberacaoId);
}

async function atualizarStatusLiberacao(liberacaoId: number) {
  const liberacao = await prisma.liberacao.findUnique({
    where: { id: liberacaoId },
    select: { status: true },
  });
  if (!liberacao) return;

  const totalVeiculos = await prisma.veiculo.count({ where: { liberacaoId } });
  const finalizados = await prisma.veiculo.count({
    where: { liberacaoId, status: StatusVeiculo.FINALIZADO },
  });

  if (liberacao.status === StatusLiberacao.CANCELADA) {
    return;
  }

  if (totalVeiculos > 0 && finalizados === totalVeiculos) {
    if (liberacao.status !== StatusLiberacao.CONCLUIDA) {
      await prisma.liberacao.update({
        where: { id: liberacaoId },
        data: { status: StatusLiberacao.CONCLUIDA },
      });
    }
    return;
  }

  if (liberacao.status === StatusLiberacao.CONCLUIDA) {
    await prisma.liberacao.update({
      where: { id: liberacaoId },
      data: { status: StatusLiberacao.ATIVA },
    });
  }
}
