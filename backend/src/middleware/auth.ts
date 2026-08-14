import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { PerfilUsuario } from '../types/prisma-types';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    perfil: PerfilUsuario;
    clienteId?: number;
    filialId?: number;
  };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token de acesso necessário', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = payload;
    next();
  } catch {
    throw new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN');
  }
}

export function requireRole(...roles: PerfilUsuario[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Não autenticado', 401, 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.perfil)) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN');
    }
    next();
  };
}
