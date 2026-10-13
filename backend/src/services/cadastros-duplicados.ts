import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';

// Forma comparável de um nome: sem acento, sem pontuação, maiúsculo e sem
// espaços — "Faz. Sta Maria", "FAZ STA MARIA" e "faz sta. maría" ficam iguais.
export function normalizar(texto: string | null | undefined) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export const somenteDigitos = (texto: string | null | undefined) => (texto ?? '').replace(/\D/g, '');

// Valores já cadastrados parecidos com `valor` (não idênticos): mesmo nome
// normalizado ou um contido no outro (a partir de 4 caracteres).
export function similares(valor: string, existentes: string[]) {
  const alvo = normalizar(valor);
  if (!alvo) return [];
  return [...new Set(existentes)].filter((item) => {
    if (item.trim().toLowerCase() === valor.trim().toLowerCase()) return false;
    const n = normalizar(item);
    if (!n) return false;
    if (n === alvo) return true;
    const [menor, maior] = n.length < alvo.length ? [n, alvo] : [alvo, n];
    return menor.length >= 4 && maior.includes(menor);
  });
}

// Modelo de carreta (nomeDescricao) novo só pode ser criado por ADMIN — os
// demais perfis escolhem um modelo que já existe. Devolve o nome como está
// cadastrado (evita "Bitrem" e "BITREM" como modelos diferentes).
export async function resolverNomeModelo(nome: string, podeCriar: boolean) {
  const valor = nome.trim();
  const existente = await prisma.modeloCarreta.findFirst({
    where: { nomeDescricao: { equals: valor, mode: 'insensitive' } },
    select: { nomeDescricao: true },
  });
  if (existente) return existente.nomeDescricao;
  if (!podeCriar) {
    throw new AppError(
      `Modelo de carreta "${valor}" não está cadastrado. Selecione um modelo da lista ou peça a um administrador para cadastrá-lo.`,
      403,
      'CADASTRO_SOMENTE_ADMIN',
    );
  }
  return valor;
}

export type DadosMotorista = { motoristaNome: string; motoristaTelefone: string; motoristaCpf?: string | null };
export type MotoristaCadastrado = { nome: string; telefone: string; cpf: string | null };

// Motorista não tem tabela própria: vive nos veículos. Procura motoristas já
// cadastrados com o mesmo nome (normalizado), CPF ou telefone, mas que não são
// exatamente os dados informados. Se os dados batem 100% com algum cadastro,
// não há o que perguntar.
export async function motoristasParecidos(dados: DadosMotorista, ignorarVeiculoId?: number): Promise<MotoristaCadastrado[]> {
  const nome = normalizar(dados.motoristaNome);
  const telefone = somenteDigitos(dados.motoristaTelefone);
  const cpf = somenteDigitos(dados.motoristaCpf);

  const grupos = await prisma.veiculo.groupBy({
    by: ['motoristaNome', 'motoristaTelefone', 'motoristaCpf'],
    where: ignorarVeiculoId ? { id: { not: ignorarVeiculoId } } : undefined,
  });

  const comparaveis = grupos.map((g) => ({
    original: { nome: g.motoristaNome, telefone: g.motoristaTelefone, cpf: g.motoristaCpf || null },
    nome: normalizar(g.motoristaNome),
    telefone: somenteDigitos(g.motoristaTelefone),
    cpf: somenteDigitos(g.motoristaCpf),
  }));

  if (comparaveis.some((g) => g.nome === nome && g.telefone === telefone && g.cpf === cpf)) return [];

  return comparaveis
    .filter((g) => (cpf && g.cpf === cpf) || (nome && g.nome === nome) || (telefone && g.telefone === telefone))
    .slice(0, 5)
    .map((g) => g.original);
}

// "Atualização de dados" de um motorista existente: aplica nome/telefone/CPF
// informados em todos os veículos e cadastros base daquele motorista.
export async function atualizarMotoristaExistente(alvo: MotoristaCadastrado, novos: DadosMotorista) {
  const where = alvo.cpf
    ? { motoristaCpf: alvo.cpf }
    : { motoristaNome: alvo.nome, motoristaTelefone: alvo.telefone, OR: [{ motoristaCpf: null }, { motoristaCpf: '' }] };
  const resultado = await prisma.veiculo.updateMany({
    where,
    data: {
      motoristaNome: novos.motoristaNome,
      motoristaTelefone: novos.motoristaTelefone,
      ...(novos.motoristaCpf ? { motoristaCpf: novos.motoristaCpf } : {}),
    },
  });
  if (resultado.count === 0) throw new AppError('Motorista a atualizar não encontrado', 404, 'NOT_FOUND');
  await prisma.modeloCarreta.updateMany({
    where: { motoristaNome: alvo.nome, motoristaTelefone: alvo.telefone },
    data: { motoristaNome: novos.motoristaNome, motoristaTelefone: novos.motoristaTelefone },
  });
}
