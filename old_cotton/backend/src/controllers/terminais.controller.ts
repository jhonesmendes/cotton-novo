import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { TipoAcesso } from '../types/prisma-types';

const schema = z.object({
  nome: z.string().min(2),
  tipoAcesso: z.nativeEnum(TipoAcesso).optional().default(TipoAcesso.LINK),
  linkSistema: z.string().url().optional().nullable(),
  login: z.string().optional().nullable(),
  senha: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  emailsContato: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  instrucoesEspecificas: z.string().optional().nullable(),
  documentosNecessarios: z.union([z.array(z.string()), z.string()]).optional().nullable(),
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
    prisma.terminal.count({ where }),
    prisma.terminal.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip,
      take,
      select: {
        id: true, 
        nome: true, 
        tipoAcesso: true, 
        linkSistema: true,
        login: true,
        emailsContato: true, 
        documentosNecessarios: true, 
        instrucoesEspecificas: true,
        cnpj: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function listarSimples(_req: AuthRequest, res: Response) {
  const terminais = await prisma.terminal.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
    },
  });
  return res.json(terminais);
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const terminal = await prisma.terminal.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  if (!terminal) throw new AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');
  return res.json(terminal);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = schema.parse(req.body);

  // Validar se terminal com mesmo nome já existe
  const existe = await prisma.terminal.findUnique({ where: { nome: data.nome } });
  if (existe) throw new AppError(`Terminal "${data.nome}" já cadastrado`, 409, 'DUPLICATE_TERMINAL_NAME');

  const terminal = await prisma.terminal.create({ 
    data: {
      ...data,
      emailsContato: Array.isArray(data.emailsContato) ? data.emailsContato.join(',') : (data.emailsContato ?? null),
      documentosNecessarios: Array.isArray(data.documentosNecessarios) ? data.documentosNecessarios.join(',') : (data.documentosNecessarios ?? null),
    },
    select: {
      id: true,
      nome: true,
      tipoAcesso: true,
      linkSistema: true,
      login: true,
      cnpj: true,
      emailsContato: true,
      instrucoesEspecificas: true,
      documentosNecessarios: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  return res.status(201).json(terminal);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const data = schema.partial().parse(req.body);

  // Validar se terminal existe
  const terminal = await prisma.terminal.findUnique({ where: { id } });
  if (!terminal) throw new AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');

  // Validar se novo nome já existe (se estiver sendo alterado)
  if (data.nome && data.nome !== terminal.nome) {
    const existe = await prisma.terminal.findUnique({ where: { nome: data.nome } });
    if (existe) throw new AppError(`Terminal "${data.nome}" já cadastrado`, 409, 'DUPLICATE_TERMINAL_NAME');
  }

  const terminalAtualizado = await prisma.terminal.update({
    where: { id },
    data: {
      ...data,
      emailsContato: Array.isArray(data.emailsContato) ? data.emailsContato.join(',') : data.emailsContato,
      documentosNecessarios: Array.isArray(data.documentosNecessarios) ? data.documentosNecessarios.join(',') : data.documentosNecessarios,
    },
    select: {
      id: true,
      nome: true,
      tipoAcesso: true,
      linkSistema: true,
      login: true,
      cnpj: true,
      emailsContato: true,
      instrucoesEspecificas: true,
      documentosNecessarios: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  return res.json(terminalAtualizado);
}

export async function deletar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  
  // Validar se terminal existe
  const terminal = await prisma.terminal.findUnique({ where: { id } });
  if (!terminal) throw new AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');

  // Validar se terminal não está em uso (tem liberações)
  const emUso = await prisma.liberacao.count({ where: { terminalId: id } });
  if (emUso > 0) {
    throw new AppError(`Terminal não pode ser deletado pois possui ${emUso} liberação(ões)`, 409, 'TERMINAL_IN_USE');
  }

  await prisma.terminal.delete({ where: { id } });
  return res.json({ message: 'Terminal removido com sucesso' });
}
