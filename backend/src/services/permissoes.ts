import { prismaBase } from '../database/prisma';

// Permissões por perfil × tela × ação, editáveis em Configurações › Permissões.
//  - ADMIN tem sempre tudo (não dá para tirar o próprio acesso de administrador).
//  - GR e VISITANTE são perfis de tela única, fixos (ver ROTAS_PERFIL_RESTRITO no auth.ts).
//  - Telas de administração (Usuários, E-mail, Permissões, Acesso do cliente, Auditoria)
//    continuam só ADMIN direto nas rotas — liberar Usuários deixaria um perfil se promover.
// Sem linha na tabela permissoes_perfil vale o PADRAO abaixo, que reproduz o que o sistema
// fazia antes desta tela existir.

export type Acao = 'ver' | 'incluir' | 'alterar' | 'excluir';
export const ACOES: Acao[] = ['ver', 'incluir', 'alterar', 'excluir'];

export const TELAS = {
  DASHBOARD: { rotulo: 'Dashboard', acoes: ['ver'] },
  LIBERACOES: { rotulo: 'Liberações', acoes: ['ver', 'incluir', 'alterar', 'excluir'], ajuda: 'Alterar inclui editar e suspender; excluir = cancelar a liberação.' },
  VEICULOS: { rotulo: 'Veículos (na liberação)', acoes: ['ver', 'incluir', 'alterar', 'excluir'], ajuda: 'Alterar inclui status, SM, agendamento e edição rápida; excluir = inativar.' },
  HISTORICO: { rotulo: 'Histórico de alterações (liberação)', acoes: ['ver'] },
  GR: { rotulo: 'GR — Gerenciadora de Risco', acoes: ['ver', 'alterar'] },
  ALERTAS: { rotulo: 'Alertas', acoes: ['ver', 'alterar'], ajuda: 'Alterar = configurar alertas.' },
  RELATORIOS: { rotulo: 'Relatórios', acoes: ['ver'] },
  CADASTROS: { rotulo: 'Revisão de Dados (cadastros)', acoes: ['ver', 'incluir', 'alterar', 'excluir'], ajuda: 'Cliente, filial, destino, origem e modelo novos continuam só do Administrador.' },
} as const satisfies Record<string, { rotulo: string; acoes: readonly Acao[]; ajuda?: string }>;

export type Tela = keyof typeof TELAS;
export const PERFIS_EDITAVEIS = ['OPERADOR', 'GESTOR_FILIAL', 'VISUALIZADOR', 'CLIENTE'] as const;
export type PerfilEditavel = (typeof PERFIS_EDITAVEIS)[number];

type Mapa = Partial<Record<Tela, Acao[]>>;
const tudo = (t: Tela) => [...TELAS[t].acoes] as Acao[];

export const PADRAO: Record<PerfilEditavel, Mapa> = {
  OPERADOR: {
    DASHBOARD: ['ver'], LIBERACOES: ['ver'], VEICULOS: tudo('VEICULOS'), HISTORICO: ['ver'],
    GR: ['ver', 'alterar'], ALERTAS: ['ver', 'alterar'], RELATORIOS: ['ver'], CADASTROS: ['ver', 'incluir', 'alterar'],
  },
  GESTOR_FILIAL: {
    DASHBOARD: ['ver'], LIBERACOES: tudo('LIBERACOES'), VEICULOS: tudo('VEICULOS'), HISTORICO: ['ver'],
    GR: ['ver', 'alterar'], ALERTAS: ['ver', 'alterar'], RELATORIOS: ['ver'], CADASTROS: ['ver', 'incluir', 'alterar'],
  },
  VISUALIZADOR: {
    DASHBOARD: ['ver'], LIBERACOES: ['ver'], VEICULOS: ['ver'], HISTORICO: ['ver'], ALERTAS: ['ver'], RELATORIOS: ['ver'], CADASTROS: ['ver'],
  },
  CLIENTE: {
    DASHBOARD: ['ver'], LIBERACOES: ['ver'], VEICULOS: ['ver'], ALERTAS: ['ver'],
  },
};

// Perfis fixos (não aparecem na tela de permissões).
const FIXOS: Record<string, Mapa> = {
  GR: { GR: ['ver', 'alterar'] },
  VISITANTE: {},
};

// Cache em memória (um processo de backend); limpo ao salvar permissões.
let cache: Map<string, boolean> | null = null;
const chave = (perfil: string, tela: string, acao: string) => `${perfil}|${tela}|${acao}`;

async function linhas() {
  if (!cache) {
    const rows = await prismaBase.permissaoPerfil.findMany();
    cache = new Map(rows.map((r) => [chave(r.perfil, r.tela, r.acao), r.permitido]));
  }
  return cache;
}

export function limparCachePermissoes() {
  cache = null;
}

const acaoExiste = (tela: Tela, acao: Acao) => (TELAS[tela].acoes as readonly Acao[]).includes(acao);

export async function pode(perfil: string, tela: Tela, acao: Acao): Promise<boolean> {
  if (!acaoExiste(tela, acao)) return false;
  if (perfil === 'ADMIN') return true;
  if (perfil in FIXOS) return !!FIXOS[perfil][tela]?.includes(acao);
  const salvo = (await linhas()).get(chave(perfil, tela, acao));
  if (salvo !== undefined) return salvo;
  return !!PADRAO[perfil as PerfilEditavel]?.[tela]?.includes(acao);
}

// Permissões efetivas de um perfil: { TELA: ['ver', ...] } — o frontend usa para menu e botões.
export async function permissoesDoPerfil(perfil: string) {
  const saida: Record<string, Acao[]> = {};
  for (const tela of Object.keys(TELAS) as Tela[]) {
    const lista: Acao[] = [];
    for (const acao of TELAS[tela].acoes as readonly Acao[]) if (await pode(perfil, tela, acao)) lista.push(acao);
    saida[tela] = lista;
  }
  return saida;
}
