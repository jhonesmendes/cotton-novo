import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { PerfilUsuario } from '../types/prisma-types';
import { executarComContexto } from '../services/auditoria-contexto';

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
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    throw new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN');
  }
  req.user = payload;
  // Todo o restante da requisição roda dentro desse contexto — é dele que a
  // auditoria tira o usuário responsável por cada alteração no banco.
  executarComContexto(
    {
      usuarioId: payload.id,
      ip: String(req.headers['x-forwarded-for'] ?? req.ip ?? '').slice(0, 200) || undefined,
      rota: `${req.method} ${req.originalUrl}`.slice(0, 300),
    },
    next,
  );
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
