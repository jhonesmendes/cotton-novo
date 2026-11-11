import { Response } from 'express';
import { z } from 'zod';
import prisma, { prismaBase } from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { CHAVES_SMTP, ConfigSmtp, configSmtp, testarSmtp } from '../services/mailer';
import { cifrar } from '../services/criptografia';

// Configurações › E-mail (SMTP), só ADMIN. A senha nunca volta para a tela: é
// gravada cifrada (ENCRYPTION_KEY) e fora da auditoria; os demais campos são auditados.

export async function lerSmtp(_req: AuthRequest, res: Response) {
  const c = await configSmtp();
  return res.json({
    host: c.host, port: c.port, secure: c.secure, user: c.user, from: c.from,
    temSenha: !!c.pass,
    origem: c.origem,
  });
}

const smtpSchema = z.object({
  host: z.string().trim().min(3, 'Informe o servidor SMTP'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(200).default(''),
  // Vazio = manter a senha atual.
  pass: z.string().max(500).optional(),
  from: z.string().trim().max(200).default(''),
});

async function gravar(chave: string, valor: string) {
  await prisma.configuracaoSistema.upsert({ where: { chave }, update: { valor }, create: { chave, valor } });
}

export async function salvarSmtp(req: AuthRequest, res: Response) {
  const d = smtpSchema.parse(req.body);
  await gravar('smtp_host', d.host);
  await gravar('smtp_port', String(d.port));
  await gravar('smtp_secure', String(d.secure));
  await gravar('smtp_user', d.user);
  await gravar('smtp_from', d.from);
  if (d.pass) {
    const valor = cifrar(d.pass);
    await prismaBase.configuracaoSistema.upsert({ where: { chave: 'smtp_pass' }, update: { valor }, create: { chave: 'smtp_pass', valor } });
  }
  return res.json({ ok: true });
}

// Volta a usar as variáveis de ambiente (ou nenhum SMTP).
export async function removerSmtp(_req: AuthRequest, res: Response) {
  await prisma.configuracaoSistema.deleteMany({ where: { chave: { in: CHAVES_SMTP.filter((c) => c !== 'smtp_pass') } } });
  await prismaBase.configuracaoSistema.deleteMany({ where: { chave: 'smtp_pass' } });
  return res.json({ ok: true });
}

// Testa com os dados do formulário (sem salvar); senha vazia usa a já gravada.
export async function testarSmtpTela(req: AuthRequest, res: Response) {
  const { para, ...dados } = z.object({ para: z.string().trim().email('Informe um e-mail válido para o teste') }).merge(smtpSchema).parse(req.body);
  const salva = await configSmtp();
  const c: ConfigSmtp = {
    host: dados.host, port: dados.port, secure: dados.secure, user: dados.user,
    pass: dados.pass || salva.pass,
    from: dados.from || dados.user,
    origem: 'tela',
  };
  try {
    await testarSmtp(c, para);
  } catch (e: any) {
    throw new AppError(`Falha no SMTP: ${e?.message ?? e}`, 400, 'SMTP_FALHOU');
  }
  return res.json({ ok: true });
}
