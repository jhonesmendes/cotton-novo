import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const criarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  estado: z.string().min(2, 'Estado (UF) é obrigatório').max(2),
});

export async function listar(req: AuthRequest, res: Response) {
  const { page = '1', limit = '100', busca } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { estado: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.destino.count({ where }),
    prisma.destino.findMany({
      where,
      select: { id: true, nome: true, estado: true },
      orderBy: { nome: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const destino = await prisma.destino.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, nome: true, estado: true },
  });

  if (!destino) throw new AppError('Destino não encontrado', 404, 'NOT_FOUND');

  return res.json(destino);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  const existe = await prisma.destino.findFirst({
    where: { nome: { equals: data.nome } },
  });
  if (existe) throw new AppError(`Destino "${data.nome}" já existe`, 409, 'DUPLICATE');

  const destino = await prisma.destino.create({ data });
  return res.status(201).json(destino);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);

  const destino = await prisma.destino.findUnique({ where: { id: parseInt(id) } });
  if (!destino) throw new AppError('Destino não encontrado', 404, 'NOT_FOUND');

  const atualizado = await prisma.destino.update({
    where: { id: parseInt(id) },
    data,
  });
  return res.json(atualizado);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const destino = await prisma.destino.findUnique({ where: { id: parseInt(id) } });
  if (!destino) throw new AppError('Destino não encontrado', 404, 'NOT_FOUND');

  const vinculadas = await prisma.liberacao.count({ where: { destinoId: parseInt(id) } });
  if (vinculadas > 0) {
    throw new AppError(
      `Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a este destino`,
      400,
      'HAS_DEPENDENCIES',
    );
  }

  await prisma.destino.delete({ where: { id: parseInt(id) } });
  return res.json({ message: 'Destino excluído com sucesso' });
}
