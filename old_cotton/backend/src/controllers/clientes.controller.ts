import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const criarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  contatos: z.string().optional(),
});

export async function listar(req: AuthRequest, res: Response) {
  const { page = '1', limit = '100', busca } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { cnpj: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      select: { id: true, nome: true, email: true, cnpj: true },
      orderBy: { nome: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const cliente = await prisma.cliente.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, nome: true, email: true, cnpj: true },
  });

  if (!cliente) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');

  return res.json(cliente);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = criarSchema.parse(req.body);

  const existe = await prisma.cliente.findFirst({ where: { nome: { equals: data.nome } } });
  if (existe) throw new AppError(`Cliente "${data.nome}" já existe`, 409, 'DUPLICATE');

  const cliente = await prisma.cliente.create({ data });
  return res.status(201).json(cliente);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = criarSchema.partial().parse(req.body);

  const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(id) } });
  if (!cliente) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');

  const atualizado = await prisma.cliente.update({ where: { id: parseInt(id) }, data });
  return res.json(atualizado);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(id) } });
  if (!cliente) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');

  const vinculadas = await prisma.liberacao.count({ where: { clienteId: parseInt(id) } });
  if (vinculadas > 0) {
    throw new AppError(
      `Não é possível excluir: existem ${vinculadas} liberação(ões) vinculadas a este cliente`,
      400,
      'HAS_DEPENDENCIES',
    );
  }

  await prisma.cliente.delete({ where: { id: parseInt(id) } });
  return res.json({ message: 'Cliente excluído com sucesso' });
}
