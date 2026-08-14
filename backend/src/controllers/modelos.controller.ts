import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const schema = z.object({
  nomeDescricao: z.string().min(3),
  placaVeiculo: z.string().optional(),
  motoristaNome: z.string().optional(),
  motoristaTelefone: z.string().optional(),
  capacidadeMaximaFardos: z.number().int().nonnegative(),
  pesoMaximoKg: z.number().int().nonnegative(),
  comprimentoM: z.number().positive().optional(),
  larguraM: z.number().positive().optional(),
  alturaM: z.number().positive().optional(),
  caracteristicasEspeciais: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

export async function listar(req: AuthRequest, res: Response) {
  const { page = '1', limit = '100', busca } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (busca) {
    where.OR = [
      { nomeDescricao: { contains: busca } },
      { motoristaNome: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.modeloCarreta.count({ where }),
    prisma.modeloCarreta.findMany({
      where,
      orderBy: { nomeDescricao: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const modelo = await prisma.modeloCarreta.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  if (!modelo) throw new AppError('Modelo não encontrado', 404);
  return res.json(modelo);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = schema.parse(req.body);
  const modelo = await prisma.modeloCarreta.create({ data });
  return res.status(201).json(modelo);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const data = schema.partial().parse(req.body);
  const modelo = await prisma.modeloCarreta.update({
    where: { id: parseInt(req.params.id) },
    data,
  });
  // Correções feitas no Cadastro Base são propagadas aos vínculos existentes.
  await prisma.veiculo.updateMany({
    where: { modeloCarretaId: modelo.id },
    data: {
      ...(data.placaVeiculo !== undefined ? { placa: data.placaVeiculo } : {}),
      ...(data.motoristaNome !== undefined ? { motoristaNome: data.motoristaNome } : {}),
      ...(data.motoristaTelefone !== undefined ? { motoristaTelefone: data.motoristaTelefone } : {}),
    },
  });
  return res.json(modelo);
}

// Repara os dados históricos usando Cadastros Base como fonte de verdade.
export async function sincronizarVinculos(_req: AuthRequest, res: Response) {
  const cadastros = await prisma.modeloCarreta.findMany({
    select: { id: true, placaVeiculo: true, motoristaNome: true, motoristaTelefone: true },
  });

  const resultados = await Promise.all(cadastros.map((cadastro) => prisma.veiculo.updateMany({
    where: { modeloCarretaId: cadastro.id },
    data: {
      ...(cadastro.placaVeiculo ? { placa: cadastro.placaVeiculo } : {}),
      ...(cadastro.motoristaNome ? { motoristaNome: cadastro.motoristaNome } : {}),
      ...(cadastro.motoristaTelefone ? { motoristaTelefone: cadastro.motoristaTelefone } : {}),
    },
  })));

  return res.json({ atualizados: resultados.reduce((total, item) => total + item.count, 0) });
}

export async function deletar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const emUso = await prisma.veiculo.findFirst({ where: { modeloCarretaId: id } });
  if (emUso) throw new AppError('Modelo em uso por veículos, não pode ser deletado', 400);

  await prisma.modeloCarreta.delete({ where: { id } });
  return res.json({ message: 'Modelo removido' });
}
