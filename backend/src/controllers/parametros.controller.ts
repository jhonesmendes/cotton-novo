import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { ChaveParametro, PARAMETROS, lerParametro } from '../services/parametros';

export async function listar(_req: AuthRequest, res: Response) {
  const chaves = Object.keys(PARAMETROS) as ChaveParametro[];
  const itens = await Promise.all(chaves.map(async (chave) => ({ chave, ...PARAMETROS[chave], valor: await lerParametro(chave) })));
  return res.json(itens);
}

// Só ADMIN (ver rota). A gravação passa pela auditoria como qualquer escrita.
export async function salvar(req: AuthRequest, res: Response) {
  const { chave, valor } = z.object({ chave: z.string(), valor: z.number() }).parse(req.body);
  if (!(chave in PARAMETROS)) throw new AppError(`Parâmetro desconhecido: ${chave}`, 400, 'PARAMETRO_INVALIDO');
  const def = PARAMETROS[chave as ChaveParametro];
  if (valor < def.min || valor > def.max) {
    throw new AppError(`${def.rotulo} deve ficar entre ${def.min} e ${def.max}${def.unidade}`, 400, 'PARAMETRO_INVALIDO');
  }
  await prisma.configuracaoSistema.upsert({ where: { chave }, update: { valor: String(valor) }, create: { chave, valor: String(valor) } });
  return res.json({ chave, valor });
}
