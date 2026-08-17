import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import sqlite3 from 'sqlite3';
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

  const db = new sqlite3.Database('./dev.db');

  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email], async (err, user: any) => {
      if (err) {
        db.close();
        reject(new AppError('Erro interno do servidor', 500));
        return;
      }

      if (!user) {
        db.close();
        reject(new AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS'));
        return;
      }

      const valid = await bcrypt.compare(password, user.senha_hash);
      if (!valid) {
        db.close();
        reject(new AppError('Email ou senha inválidos', 401, 'INVALID_CREDENTIALS'));
        return;
      }

      // Atualizar lastLogin
      db.run('UPDATE usuarios SET updated_at = datetime("now") WHERE id = ?', [user.id], (err) => {
        db.close();

        if (err) {
          console.error('Erro ao atualizar lastLogin:', err);
        }

        const payload = {
          id: user.id,
          email: user.email,
          perfil: user.perfil,
          clienteId: null,
          filialId: null,
        };

        const accessToken = signAccess(payload);
        const refreshToken = signRefresh(payload);

        res.json({
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            perfil: user.perfil,
          },
          accessToken,
          refreshToken,
        });

        resolve(null);
      });
    });
  });
}

export async function refreshToken(req: AuthRequest, res: Response) {
  const payload = {
    id: req.user!.id,
    email: req.user!.email,
    perfil: req.user!.perfil,
    clienteId: req.user!.clienteId,
    filialId: req.user!.filialId,
  };

  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  res.json({ accessToken, refreshToken });
}

export async function getProfile(req: AuthRequest, res: Response) {
  const db = new sqlite3.Database('./dev.db');

  return new Promise((resolve, reject) => {
    db.get('SELECT id, nome, email, perfil, ativo, created_at, updated_at FROM usuarios WHERE id = ?', [req.user!.id], (err, user: any) => {
      db.close();

      if (err || !user) {
        reject(new AppError('Usuário não encontrado', 404));
        return;
      }

      res.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        ativo: Boolean(user.ativo),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      });

      resolve(null);
    });
  });
}
