import nodemailer from 'nodemailer';
import { prismaBase } from '../database/prisma';
import { decifrar } from './criptografia';

// Configuração do SMTP: a da tela (Configurações › E-mail, tabela configuracoes_sistema)
// tem prioridade; sem ela, vale a das variáveis de ambiente SMTP_*.
export const CHAVES_SMTP = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from'] as const;

export interface ConfigSmtp {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  origem: 'tela' | 'ambiente' | 'nenhuma';
}

export async function configSmtp(): Promise<ConfigSmtp> {
  const linhas = await prismaBase.configuracaoSistema.findMany({ where: { chave: { in: [...CHAVES_SMTP] } } });
  const v = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  if (v.smtp_host) {
    let pass = '';
    try { pass = v.smtp_pass ? decifrar(v.smtp_pass) : ''; } catch { console.error('[mailer] não foi possível decifrar a senha do SMTP (ENCRYPTION_KEY mudou?)'); }
    return {
      host: v.smtp_host,
      port: Number(v.smtp_port || 587),
      secure: v.smtp_secure === 'true',
      user: v.smtp_user ?? '',
      pass,
      from: v.smtp_from || v.smtp_user || '',
      origem: 'tela',
    };
  }
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      origem: 'ambiente',
    };
  }
  return { host: '', port: 587, secure: false, user: '', pass: '', from: '', origem: 'nenhuma' };
}

function transportador(c: ConfigSmtp) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.pass } : undefined,
  });
}

// Sem SMTP configurado, não envia: só loga o conteúdo (útil em dev).
export async function enviarEmail(to: string, subject: string, html: string) {
  const c = await configSmtp();
  if (c.origem === 'nenhuma') {
    console.warn(`[mailer] SMTP não configurado — email para ${to} não foi enviado ("${subject}")`);
    console.warn(html);
    return;
  }
  await transportador(c).sendMail({ from: c.from, to, subject, html });
}

// Teste da tela de configuração: verifica a conexão e envia de verdade.
export async function testarSmtp(c: ConfigSmtp, para: string) {
  const t = transportador(c);
  await t.verify();
  await t.sendMail({
    from: c.from,
    to: para,
    subject: 'Teste de e-mail — Cotton Fibra Forte',
    html: '<p>Este é um e-mail de teste do sistema Cotton Fibra Forte. Se chegou, o SMTP está configurado corretamente.</p>',
  });
}
