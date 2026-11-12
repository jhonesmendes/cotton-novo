import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PerfilUsuario, TipoAcessoCliente } from '@prisma/client';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { enviarEmail } from '../services/mailer';
import { posicaoDoCliente } from '../services/posicao-cliente';

// Acesso do cliente à tela de posição (item 19):
//  - LINK: sem login, vale 24 h;
//  - CONVITE: e-mail com link de cadastro (7 h) que cria um usuário VISITANTE preso ao cliente.
// Só ADMIN gera (rotas), sempre para um cliente. O token cru só vai no link; no banco fica o hash.

const HORA_MS = 60 * 60 * 1000;
const VALIDADE = { [TipoAcessoCliente.LINK]: 24 * HORA_MS, [TipoAcessoCliente.CONVITE]: 7 * HORA_MS };

const baseFrontend = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

async function novoAcesso(tipo: TipoAcessoCliente, clienteId: number, geradoPorId: number, email?: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const acesso = await prisma.acessoCliente.create({
    data: { tipo, clienteId, email, tokenHash: hash(token), geradoPorId, expiraEm: new Date(Date.now() + VALIDADE[tipo]) },
  });
  const caminho = tipo === TipoAcessoCliente.LINK ? 'posicao' : 'convite';
  return { acesso, url: `${baseFrontend()}/${caminho}/${token}` };
}

async function enviarConvite(email: string, clienteNome: string, url: string, expiraEm: Date) {
  const validade = expiraEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  await enviarEmail(
    email,
    'Convite — acompanhamento de cargas Cotton Fibra Forte',
    `<p>Olá!</p>
     <p>Você foi convidado(a) a acompanhar a posição dos caminhões de <strong>${clienteNome}</strong> no sistema Cotton Fibra Forte.</p>
     <p><a href="${url}">Clique aqui para criar seu acesso</a> (nome, telefone e senha).</p>
     <p>Este link vale até ${validade}. Depois disso, peça um novo convite.</p>`,
  );
}

function situacao(a: { tipo: TipoAcessoCliente; expiraEm: Date; canceladoEm: Date | null; aceitoEm: Date | null; usuario?: { ativo: boolean } | null }) {
  if (a.canceladoEm) return 'CANCELADO';
  if (a.tipo === TipoAcessoCliente.CONVITE && a.aceitoEm) return a.usuario?.ativo === false ? 'VISITANTE_DESATIVADO' : 'ACEITO';
  return a.expiraEm < new Date() ? 'EXPIRADO' : 'VALIDO';
}

export async function listar(_req: AuthRequest, res: Response) {
  const acessos = await prisma.acessoCliente.findMany({
    include: {
      cliente: { select: { id: true, nome: true } },
      geradoPor: { select: { nome: true } },
      usuario: { select: { id: true, nome: true, email: true, ativo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return res.json(acessos.map(({ tokenHash: _oculto, ...a }) => ({ ...a, situacao: situacao(a) })));
}

export async function gerarLink(req: AuthRequest, res: Response) {
  const { clienteId } = z.object({ clienteId: z.number().int().positive() }).parse(req.body);
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new AppError('Cliente não encontrado', 404);
  const { acesso, url } = await novoAcesso(TipoAcessoCliente.LINK, clienteId, req.user!.id);
  // A URL com o token só é devolvida agora — depois não dá para recuperar.
  return res.status(201).json({ id: acesso.id, url, expiraEm: acesso.expiraEm });
}

export async function convidar(req: AuthRequest, res: Response) {
  const { clienteId, email } = z.object({ clienteId: z.number().int().positive(), email: z.string().trim().toLowerCase().email() }).parse(req.body);
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new AppError('Cliente não encontrado', 404);
  if (await prisma.usuario.findUnique({ where: { email } })) {
    throw new AppError('Já existe usuário com este e-mail', 409, 'EMAIL_EM_USO');
  }
  const { acesso, url } = await novoAcesso(TipoAcessoCliente.CONVITE, clienteId, req.user!.id, email);
  await enviarConvite(email, cliente.nome, url, acesso.expiraEm);
  return res.status(201).json({ id: acesso.id, url, expiraEm: acesso.expiraEm });
}

// Reenviar convite = cancela o anterior e gera outro (novo prazo de 7 h).
export async function reenviar(req: AuthRequest, res: Response) {
  const anterior = await prisma.acessoCliente.findUnique({ where: { id: parseInt(req.params.id) }, include: { cliente: true } });
  if (!anterior || anterior.tipo !== TipoAcessoCliente.CONVITE || !anterior.email) throw new AppError('Convite não encontrado', 404);
  if (anterior.aceitoEm) throw new AppError('Convite já aceito', 400);
  await prisma.acessoCliente.update({ where: { id: anterior.id }, data: { canceladoEm: new Date() } });
  const { acesso, url } = await novoAcesso(TipoAcessoCliente.CONVITE, anterior.clienteId, req.user!.id, anterior.email);
  await enviarConvite(anterior.email, anterior.cliente.nome, url, acesso.expiraEm);
  return res.json({ id: acesso.id, url, expiraEm: acesso.expiraEm });
}

export async function cancelar(req: AuthRequest, res: Response) {
  const acesso = await prisma.acessoCliente.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!acesso) throw new AppError('Acesso não encontrado', 404);
  await prisma.acessoCliente.update({ where: { id: acesso.id }, data: { canceladoEm: new Date() } });
  // Desativa também o visitante criado por esse convite.
  if (acesso.usuarioId) await prisma.usuario.update({ where: { id: acesso.usuarioId }, data: { ativo: false } });
  return res.json({ ok: true });
}

// Excluir de vez = apagar o registro da lista. Só para o que já não vale nada
// (expirado, cancelado ou visitante desativado); válido/ativo precisa ser cancelado antes.
const REMOVIVEIS = new Set(['EXPIRADO', 'CANCELADO', 'VISITANTE_DESATIVADO']);
const comUsuario = { usuario: { select: { ativo: true } } } as const;

export async function excluir(req: AuthRequest, res: Response) {
  const acesso = await prisma.acessoCliente.findUnique({ where: { id: parseInt(req.params.id) }, include: comUsuario });
  if (!acesso) throw new AppError('Acesso não encontrado', 404);
  if (!REMOVIVEIS.has(situacao(acesso))) {
    throw new AppError('Este acesso ainda vale. Cancele (ou desative o visitante) antes de excluir.', 400, 'ACESSO_EM_USO');
  }
  await prisma.acessoCliente.delete({ where: { id: acesso.id } });
  return res.json({ ok: true });
}

// Limpa de uma vez todos os expirados/cancelados/desativados.
export async function limparEncerrados(_req: AuthRequest, res: Response) {
  const todos = await prisma.acessoCliente.findMany({ include: comUsuario });
  const ids = todos.filter((a) => REMOVIVEIS.has(situacao(a))).map((a) => a.id);
  if (ids.length) await prisma.acessoCliente.deleteMany({ where: { id: { in: ids } } });
  return res.json({ removidos: ids.length });
}

// ─── Públicas (sem login) ────────────────────────────────────────────────────

async function acessoValido(token: string, tipo: TipoAcessoCliente) {
  const acesso = await prisma.acessoCliente.findUnique({ where: { tokenHash: hash(token) }, include: { cliente: { select: { nome: true } } } });
  if (!acesso || acesso.tipo !== tipo || acesso.canceladoEm || acesso.expiraEm < new Date() || (tipo === TipoAcessoCliente.CONVITE && acesso.aceitoEm)) {
    throw new AppError(tipo === TipoAcessoCliente.LINK ? 'Link inválido ou expirado. Peça um novo link.' : 'Convite inválido ou expirado. Peça um novo convite.', 404, 'ACESSO_INVALIDO');
  }
  return acesso;
}

export async function posicaoPorLink(req: Request, res: Response) {
  const acesso = await acessoValido(req.params.token, TipoAcessoCliente.LINK);
  if (!acesso.usadoEm) await prisma.acessoCliente.update({ where: { id: acesso.id }, data: { usadoEm: new Date() } });
  return res.json({ ...(await posicaoDoCliente(acesso.clienteId)), linkValidoAte: acesso.expiraEm });
}

export async function dadosConvite(req: Request, res: Response) {
  const acesso = await acessoValido(req.params.token, TipoAcessoCliente.CONVITE);
  return res.json({ email: acesso.email, cliente: acesso.cliente.nome, expiraEm: acesso.expiraEm });
}

export async function aceitarConvite(req: Request, res: Response) {
  const dados = z.object({
    nome: z.string().trim().min(3, 'Informe o nome'),
    telefone: z.string().trim().min(10, 'Informe o telefone com DDD'),
    senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').regex(/[A-Za-z]/, 'A senha precisa de letra').regex(/\d/, 'A senha precisa de número'),
  }).parse(req.body);
  const acesso = await acessoValido(req.params.token, TipoAcessoCliente.CONVITE);
  if (await prisma.usuario.findUnique({ where: { email: acesso.email! } })) {
    throw new AppError('Já existe usuário com este e-mail', 409, 'EMAIL_EM_USO');
  }
  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      telefone: dados.telefone.replace(/\D/g, ''),
      email: acesso.email!,
      senhaHash: await bcrypt.hash(dados.senha, 12),
      perfil: PerfilUsuario.VISITANTE,
      clienteId: acesso.clienteId,
    },
  });
  await prisma.acessoCliente.update({ where: { id: acesso.id }, data: { aceitoEm: new Date(), usuarioId: usuario.id } });
  return res.status(201).json({ email: usuario.email });
}

// ─── Visitante logado ────────────────────────────────────────────────────────

export async function posicaoVisitante(req: AuthRequest, res: Response) {
  if (!req.user?.clienteId) throw new AppError('Usuário sem cliente vinculado', 403, 'FORBIDDEN');
  return res.json(await posicaoDoCliente(req.user.clienteId));
}
