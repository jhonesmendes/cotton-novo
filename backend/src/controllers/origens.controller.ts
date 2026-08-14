import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const criarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  localizacao: z.string().min(1, 'Localização é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório').max(2),
});

export async function listar(req: AuthRequest, res: Response) {
  const { page = '1', limit = '100', busca } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { localizacao: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.origem.count({ where }),
    prisma.origem.findMany({
      where,
      select: { id: true, nome: true, localizacao: true, estado: true },
      orderBy: { nome: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const origem = await prisma.origem.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, nome: true, localizacao: true, estado: true },
  });

  if (!origem) throw new AppError('Origem não encontrada', 404, 'NOT_FOUND');

  return res.json(origem);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  const existe = await prisma.origem.findFirst({
    where: { nome: { equals: data.nome } },
  });
  if (existe) throw new AppError(`Filial/Origem "${data.nome}" já existe`, 409, 'DUPLICATE');

  const origem = await prisma.origem.create({ data });
  return res.status(201).json(origem);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);

  const origem = await prisma.origem.findUnique({ where: { id: parseInt(id) } });
  if (!origem) throw new AppError('Origem não encontrada', 404, 'NOT_FOUND');

  const atualizada = await prisma.origem.update({
    where: { id: parseInt(id) },
    data,
  });
  return res.json(atualizada);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const origem = await prisma.origem.findUnique({ where: { id: parseInt(id) } });
  if (!origem) throw new AppError('Origem não encontrada', 404, 'NOT_FOUND');

  const vinculadas = await prisma.liberacao.count({ where: { origemId: parseInt(id) } });
  if (vinculadas > 0) {
    throw new AppError(
      `Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a esta filial`,
      400,
      'HAS_DEPENDENCIES',
    );
  }

  await prisma.origem.delete({ where: { id: parseInt(id) } });
  return res.json({ message: 'Filial/Origem excluída com sucesso' });
}
