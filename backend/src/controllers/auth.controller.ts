import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { enviarEmail } from '../services/mailer';

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

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await prisma.usuario.findUnique({ where: { email } });

  // Resposta sempre igual, exista o usuário ou não — evita confirmar por
  // tentativa e erro quais emails têm conta no sistema.
  if (user && user.ativo) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.deleteMany({ where: { usuarioId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        usuarioId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha?token=${rawToken}`;
    await enviarEmail(
      user.email,
      'Redefinição de senha — Cotton Fibra Forte',
      `<p>Olá, ${user.nome}.</p>
       <p>Recebemos um pedido para redefinir sua senha no sistema Cotton Fibra Forte.</p>
       <p><a href="${link}">Clique aqui para escolher uma nova senha</a></p>
       <p>Esse link expira em 1 hora. Se você não pediu isso, pode ignorar este email.</p>`,
    ).catch((e) => console.error('[forgotPassword] falha ao enviar email:', e));
  }

  return res.json({ message: 'Se o email existir no sistema, enviamos um link de redefinição.' });
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z.string().min(6, 'Senha muito curta'),
});

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw new AppError('Link inválido ou expirado. Peça uma nova redefinição.', 400, 'INVALID_TOKEN');
  }

  const senhaHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: reset.usuarioId }, data: { senhaHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  return res.json({ message: 'Senha redefinida com sucesso.' });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.usuario.findUnique({
    where: { id: req.user!.id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, lastLogin: true },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return res.json(user);
}
