import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  ACOES, Acao, PADRAO, PERFIS_EDITAVEIS, PerfilEditavel, TELAS, Tela, limparCachePermissoes, permissoesDoPerfil,
} from '../services/permissoes';

// O que o usuário logado pode fazer (menu, rotas e botões do frontend).
export async function minhas(req: AuthRequest, res: Response) {
  return res.json({ perfil: req.user!.perfil, permissoes: await permissoesDoPerfil(req.user!.perfil) });
}

// Matriz completa para a tela de permissões (só ADMIN, ver rota).
export async function listar(_req: AuthRequest, res: Response) {
  const perfis = await Promise.all(PERFIS_EDITAVEIS.map(async (perfil) => ({
    perfil,
    permissoes: await permissoesDoPerfil(perfil),
    padrao: PADRAO[perfil],
  })));
  return res.json({
    telas: Object.entries(TELAS).map(([tela, d]) => ({ tela, ...d })),
    acoes: ACOES,
    perfis,
  });
}

const salvarSchema = z.object({
  perfil: z.enum(PERFIS_EDITAVEIS),
  permissoes: z.record(z.string(), z.array(z.enum(['ver', 'incluir', 'alterar', 'excluir']))),
});

// Grava a matriz inteira de um perfil (uma linha por tela × ação, permitido sim/não).
// Sem "ver" na tela, as demais ações daquela tela ficam desligadas.
export async function salvar(req: AuthRequest, res: Response) {
  const { perfil, permissoes } = salvarSchema.parse(req.body);
  const desconhecidas = Object.keys(permissoes).filter((t) => !(t in TELAS));
  if (desconhecidas.length) throw new AppError(`Tela desconhecida: ${desconhecidas.join(', ')}`, 400);

  await prisma.$transaction(async (tx) => {
    for (const tela of Object.keys(TELAS) as Tela[]) {
      const marcadas = new Set(permissoes[tela] ?? []);
      for (const acao of TELAS[tela].acoes as readonly Acao[]) {
        const permitido = marcadas.has('ver') && marcadas.has(acao);
        await tx.permissaoPerfil.upsert({
          where: { perfil_tela_acao: { perfil, tela, acao } },
          update: { permitido },
          create: { perfil, tela, acao, permitido },
        });
      }
    }
  });
  limparCachePermissoes();
  return res.json({ perfil, permissoes: await permissoesDoPerfil(perfil) });
}

// Volta o perfil para o padrão do sistema.
export async function restaurar(req: AuthRequest, res: Response) {
  const perfil = z.enum(PERFIS_EDITAVEIS).parse(req.params.perfil) as PerfilEditavel;
  await prisma.permissaoPerfil.deleteMany({ where: { perfil } });
  limparCachePermissoes();
  return res.json({ perfil, permissoes: await permissoesDoPerfil(perfil) });
}
