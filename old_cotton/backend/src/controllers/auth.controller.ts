import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha muito curta'),
});

function signAccess(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '8h',
  });
}

function signRefresh(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || !user.ativo) {
    throw new AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.senhaHash);
  if (!valid) {
    throw new AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS');
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const payload = {
    id: user.id,
    email: user.email,
    perfil: user.perfil,
    clienteId: user.clienteId,
    filialId: user.filialId,
  };

  return res.json({
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ id: user.id }),
    user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
  });
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: 'Logout realizado' });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = req.body;
  if (!token) throw new AppError('Refresh token obrigatório', 400);

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    throw new AppError('Refresh token inválido', 401, 'INVALID_TOKEN');
  }

  const user = await prisma.usuario.findUnique({ where: { id: decoded.id } });
  if (!user || !user.ativo) throw new AppError('Usuário inativo', 401);

  const payload = {
    id: user.id,
    email: user.email,
    perfil: user.perfil,
    clienteId: user.clienteId,
    filialId: user.filialId,
  };

  return res.json({ accessToken: signAccess(payload) });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.usuario.findUnique({
    where: { id: req.user!.id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, lastLogin: true },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return res.json(user);
}
