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
      { cidade: { contains: busca } }, { estado: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.localColeta.count({ where }),
    prisma.localColeta.findMany({
      where,
      select: { id: true, nome: true, cidade: true, estado: true },
      orderBy: { nome: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const localColeta = await prisma.localColeta.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, nome: true, cidade: true, estado: true },
  });

  if (!localColeta) throw new AppError('localColeta não encontrado', 404, 'NOT_FOUND');

  return res.json(localColeta);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  const existe = await prisma.localColeta.findFirst({
    where: { nome: { equals: data.nome } },
  });
  if (existe) throw new AppError(`localColeta "${data.nome}" já existe`, 409, 'DUPLICATE');

  const localColeta = await prisma.localColeta.create({ data });
  return res.status(201).json(localColeta);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);

  const localColeta = await prisma.localColeta.findUnique({ where: { id: parseInt(id) } });
  if (!localColeta) throw new AppError('localColeta não encontrado', 404, 'NOT_FOUND');

  const atualizado = await prisma.localColeta.update({
    where: { id: parseInt(id) },
    data,
  });
  return res.json(atualizado);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const localColeta = await prisma.localColeta.findUnique({ where: { id: parseInt(id) } });
  if (!localColeta) throw new AppError('localColeta não encontrado', 404, 'NOT_FOUND');

  const vinculadas = await prisma.liberacao.count({ where: { localColetaId: parseInt(id) } });
  if (vinculadas > 0) {
    throw new AppError(
      `Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a este localColeta`,
      400,
      'HAS_DEPENDENCIES',
    );
  }

  await prisma.localColeta.delete({ where: { id: parseInt(id) } });
  return res.json({ message: 'localColeta excluído com sucesso' });
}
