import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { PerfilUsuario } from '../types/prisma-types';
import { executarComContexto } from '../services/auditoria-contexto';
import prisma from '../database/prisma';
import { Acao, Tela, pode } from '../services/permissoes';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    perfil: PerfilUsuario;
    clienteId?: number;
    filialId?: number;
  };
}

const ROTAS_PERFIL_RESTRITO: Partial<Record<string, string[]>> = {
  GR: ['/api/gr', '/api/auth', '/api/permissoes/minhas'],
  VISITANTE: ['/api/posicao-cliente', '/api/auth', '/api/permissoes/minhas'],
};

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
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

  // Perfil/ativo vêm do banco, não do token: trocar o perfil ou desativar um
  // usuário vale na hora, sem esperar o access token vencer.
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, perfil: true, ativo: true, clienteId: true, filialId: true },
  });
  if (!usuario || !usuario.ativo) {
    throw new AppError('Usuário inativo ou inexistente', 401, 'INVALID_TOKEN');
  }
  // Perfis de tela única só alcançam as rotas deles (o resto da API é negado aqui,
  // para nenhuma rota nova ficar aberta por esquecimento).
  const permitidas = ROTAS_PERFIL_RESTRITO[usuario.perfil];
  if (permitidas && !permitidas.some((prefixo) => req.originalUrl.startsWith(prefixo))) {
    throw new AppError('Acesso negado para este perfil', 403, 'FORBIDDEN');
  }
  req.user = {
    id: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil as PerfilUsuario,
    clienteId: usuario.clienteId ?? undefined,
    filialId: usuario.filialId ?? undefined,
  };
  // Todo o restante da requisição roda dentro desse contexto — é dele que a
  // auditoria tira o usuário responsável por cada alteração no banco.
  executarComContexto(
    {
      usuarioId: usuario.id,
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

// Permissão editável por perfil × tela × ação (Configurações › Permissões).
// Use nas rotas no lugar de requireRole sempre que a regra for "quem pode ver/incluir/
// alterar/excluir nesta tela". Regras fixas de negócio (ex.: só ADMIN fecha instrução
// com pendência) continuam com requireRole.
export function exigirPermissao(tela: Tela, acao: Acao) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Não autenticado', 401, 'UNAUTHORIZED');
    if (!(await pode(req.user.perfil, tela, acao))) {
      throw new AppError('Seu perfil não tem permissão para esta ação', 403, 'FORBIDDEN');
    }
    next();
  };
}
