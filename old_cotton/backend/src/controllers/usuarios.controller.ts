import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { PerfilUsuario } from '../types/prisma-types';

const schema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  senha: z.string().min(8).optional(),
  telefone: z.string().optional(),
  perfil: z.nativeEnum(PerfilUsuario),
  clienteId: z.number().int().positive().optional().nullable(),
  filialId: z.number().int().positive().optional().nullable(),
  ativo: z.boolean().default(true),
});

export async function listar(req: AuthRequest, res: Response) {
  const { page = '1', limit = '100', busca } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { email: { contains: busca } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: {
        id: true, nome: true, email: true, perfil: true, ativo: true,
        telefone: true, lastLogin: true, createdAt: true,
        cliente: { select: { id: true, nome: true } },
        filial: { select: { id: true, nome: true } },
      },
      orderBy: { nome: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function criar(req: AuthRequest, res: Response) {
  const data = schema.parse(req.body);
  if (!data.senha) throw new AppError('Senha obrigatória ao criar usuário', 400);

  const senhaHash = await bcrypt.hash(data.senha, 12);
  const { senha, ...rest } = data;

  const usuario = await prisma.usuario.create({
    data: { ...rest, senhaHash },
    select: { id: true, nome: true, email: true, perfil: true },
  });
  return res.status(201).json(usuario);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = schema.partial().parse(req.body);

  const updateData: any = { ...data };
  if (data.senha) {
    updateData.senhaHash = await bcrypt.hash(data.senha, 12);
    delete updateData.senha;
  }

  const usuario = await prisma.usuario.update({
    where: { id: parseInt(id) },
    data: updateData,
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });
  return res.json(usuario);
}

export async function deletar(req: AuthRequest, res: Response) {
  await prisma.usuario.update({
    where: { id: parseInt(req.params.id) },
    data: { ativo: false },
  });
  return res.json({ message: 'Usuário desativado' });
}
