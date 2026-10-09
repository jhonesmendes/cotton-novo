import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { StatusLiberacao, TipoFardo, Prisma } from '@prisma/client';
import { reavaliarStatusLiberacao, situacaoFechamento } from '../services/liberacao-status';

const criarSchema = z.object({
  instrucao: z.string().min(3),
  dataLiberacao: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dataColeta: z.string(),
  clienteId: z.number().int().positive().optional(),
  origemId: z.number().int().positive().optional(),
  destinoId: z.number().int().positive().optional(),
  terminalId: z.number().int().positive().optional(),
  localColetaId: z.number().int().positive().optional(),
  clienteNome: z.string().min(2).optional(),
  filialNome: z.string().min(2).optional(),
  destinoNome: z.string().min(2).optional(),
  origemNome: z.string().min(2).optional(),
  localColetaNome: z.string().min(2).optional(),
  freteEmpresa: z.number().positive(),
  totalFardos: z.number().int().positive(),
  tipoFardo: z.nativeEnum(TipoFardo).default(TipoFardo.FARDAO),
  deadline: z.string(),
  observacao: z.string().optional(),
});

// Filial embarcadora (model Origem) só pode ser criada por ADMIN — os demais
// perfis só escolhem uma já cadastrada, pra não surgir "SORRISO-MT" e
// "SORRISO - MT" como filiais diferentes.
async function resolverCadastros(data: any, podeCriarFilial: boolean) {
  const buscarOuCriar = async (tipo: 'cliente' | 'origem' | 'destino' | 'terminal' | 'localColeta', id: number | undefined, nome: string | undefined) => {
    if (id) return id;
    const valor = nome?.trim();
    if (!valor) return undefined;
    if (tipo === 'cliente') {
      const item = await prisma.cliente.findFirst({ where: { nome: valor } });
      return item?.id ?? (await prisma.cliente.create({ data: { nome: valor, cnpj: `PENDENTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } })).id;
    }
    if (tipo === 'origem') {
      const item = await prisma.origem.findFirst({ where: { nome: { equals: valor, mode: 'insensitive' } } });
      if (item) {
        data.filialNome = item.nome;
        return item.id;
      }
      if (!podeCriarFilial) {
        throw new AppError(`Filial embarcadora "${valor}" não está cadastrada. Selecione uma filial da lista ou peça a um administrador para cadastrá-la.`, 400, 'FILIAL_NAO_CADASTRADA');
      }
      return (await prisma.origem.create({ data: { nome: valor, localizacao: 'Pendente', estado: '--' } })).id;
    }
    if (tipo === 'destino') {
      const item = await prisma.destino.findFirst({ where: { nome: valor } });
      return item?.id ?? (await prisma.destino.create({ data: { nome: valor, estado: '--' } })).id;
    }
    if (tipo === 'terminal') {
      const item = await prisma.terminal.findUnique({ where: { nome: valor } });
      return item?.id ?? (await prisma.terminal.create({ data: { nome: valor, tipoAcesso: 'EMAIL' } })).id;
    }
    const item = await prisma.localColeta.findFirst({ where: { nome: valor } });
    return item?.id ?? (await prisma.localColeta.create({ data: { nome: valor } })).id;
  };

  return {
    clienteId: await buscarOuCriar('cliente', data.clienteId, data.clienteNome),
    origemId: await buscarOuCriar('origem', data.origemId, data.filialNome),
    destinoId: await buscarOuCriar('destino', data.destinoId, data.destinoNome),
    terminalId: await buscarOuCriar('terminal', data.terminalId, data.origemNome),
    localColetaId: await buscarOuCriar('localColeta', data.localColetaId, data.localColetaNome),
  };
}

export async function listar(req: AuthRequest, res: Response) {
  const {
    clienteId, origemId, terminalId, status,
    diasMaximos, page = '1', limit = '50',
    busca, diasMinimos,
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: Prisma.LiberacaoWhereInput = {};

  if (clienteId) where.clienteId = parseInt(clienteId);
  if (origemId) where.origemId = parseInt(origemId);
  if (terminalId) where.terminalId = parseInt(terminalId);
  if (status) where.status = status as StatusLiberacao;

  // Tratamento de datas para deadline
  const deadlineFilter: any = {};
  if (diasMaximos) {
    const dataMax = new Date();
    dataMax.setDate(dataMax.getDate() + parseInt(diasMaximos));
    deadlineFilter.lte = dataMax;
  }

  if (diasMinimos) {
    const dataMin = new Date();
    dataMin.setDate(dataMin.getDate() + parseInt(diasMinimos));
    deadlineFilter.gte = dataMin;
  }

  if (Object.keys(deadlineFilter).length > 0) {
    where.deadline = deadlineFilter;
  }

  if (busca) {
    where.OR = [
      { instrucao: { contains: busca, mode: 'insensitive' } },
      { veiculos: { some: { placa: { contains: busca, mode: 'insensitive' } } } },
      { veiculos: { some: { motoristaNome: { contains: busca, mode: 'insensitive' } } } },
      { cliente: { nome: { contains: busca, mode: 'insensitive' } } },
      // campo denormalizado — cadastros antigos podem ter o nome aqui divergente da relação
      { clienteNome: { contains: busca, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.liberacao.count({ where }),
    prisma.liberacao.findMany({
      where,
      skip,
      take,
      include: {
        cliente: { select: { id: true, nome: true } },
        origem: { select: { id: true, nome: true } },
        destino: { select: { id: true, nome: true } },
        terminal: { select: { id: true, nome: true } },
        localColeta: { select: { id: true, nome: true } },
        veiculos: {
          select: {
            id: true, placa: true, status: true, qtdFardos: true,
            motoristaNome: true, motoristaTelefone: true,
            modeloCarreta: { select: { id: true, nomeDescricao: true } },
          },
        },
      },
      orderBy: { deadline: 'asc' },
    }),
  ]);

  // Calcula saldo e dias para deadline
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const data = items.map((l) => {
    const carregado = l.veiculos.reduce((s, v) => s + v.qtdFardos, 0);
    const saldo = l.totalFardos - carregado;
    const deadlineDate = new Date(l.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diasParaDeadline = Math.ceil(
      (deadlineDate.getTime() - hoje.getTime()) / 86400000,
    );
    const { aguardandoFechamento } = situacaoFechamento(l, l.veiculos);
    return { ...l, carregado, saldo, diasParaDeadline, aguardandoFechamento };
  });

  return res.json({ data, total, page: parseInt(page), limit: take });
}

export async function referencias(_req: AuthRequest, res: Response) {
  const [liberacoes, cadastradas, veiculos, filiais, modelos] = await Promise.all([prisma.liberacao.findMany({
    select: { clienteNome: true, filialNome: true, destinoNome: true, origemNome: true, localColetaNome: true },
  }), prisma.referenciaCadastro.findMany({ select: { tipo: true, valor: true } }), prisma.veiculo.findMany({ include: { modeloCarreta: { select: { nomeDescricao: true } } } }),
  prisma.origem.findMany({ select: { nome: true } }), prisma.modeloCarreta.findMany({ select: { nomeDescricao: true } })]);
  // Filiais cadastradas (model Origem) também entram na lista, mesmo sem liberação — são as mesmas do filtro da tela de Liberações.
  cadastradas.push(...filiais.map((f) => ({ tipo: 'filiais', valor: f.nome })));
  const valores = (campo: keyof (typeof liberacoes)[number], tipo: string) =>
    [...new Set([...liberacoes.map((item) => item[campo]?.trim()), ...cadastradas.filter((item) => item.tipo === tipo).map((item) => item.valor)].filter(Boolean))].sort();

  return res.json({
    clientes: valores('clienteNome', 'clientes'), filiais: valores('filialNome', 'filiais'), destinos: valores('destinoNome', 'destinos'), origens: valores('origemNome', 'origens'), locaisColeta: valores('localColetaNome', 'locaisColeta'),
    // Todos os modelos cadastrados (não só os usados em veículos), para os sem uso poderem ser excluídos.
    modelosCarreta: [...new Set(modelos.map((item) => item.nomeDescricao?.trim()).filter(Boolean))].sort(),
    motoristas: [...new Set(veiculos.map((item) => item.motoristaCpf ? `${item.motoristaNome} · CPF ${item.motoristaCpf}` : item.motoristaNome).filter(Boolean))].sort(),
  });
}

function exigirAdminParaFiliais(req: AuthRequest, tipo: string) {
  if (tipo === 'filiais' && req.user?.perfil !== 'ADMIN') {
    throw new AppError('Somente administradores podem gerenciar filiais embarcadoras', 403, 'FORBIDDEN');
  }
}

export async function criarReferencia(req: AuthRequest, res: Response) {
  const data = z.object({ tipo: z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta']), valor: z.string().min(2) }).parse(req.body);
  exigirAdminParaFiliais(req, data.tipo);
  const valor = data.valor.trim();
  if (data.tipo === 'filiais') {
    const existe = await prisma.origem.findFirst({ where: { nome: { equals: valor, mode: 'insensitive' } } });
    if (existe) throw new AppError(`Filial embarcadora "${existe.nome}" já existe`, 409, 'DUPLICATE');
    await prisma.origem.create({ data: { nome: valor, localizacao: 'Pendente', estado: '--' } });
  }
  const referencia = await prisma.referenciaCadastro.upsert({ where: { tipo_valor: { tipo: data.tipo, valor } }, update: {}, create: { tipo: data.tipo, valor } });
  return res.status(201).json(referencia);
}

// Cada tipo de referência: campo texto na Liberação, FK correspondente e o model do cadastro.
const vinculosReferencia = {
  clientes: { campo: 'clienteNome', fk: 'clienteId', model: 'cliente' },
  filiais: { campo: 'filialNome', fk: 'origemId', model: 'origem' },
  destinos: { campo: 'destinoNome', fk: 'destinoId', model: 'destino' },
  origens: { campo: 'origemNome', fk: 'terminalId', model: 'terminal' },
  locaisColeta: { campo: 'localColetaNome', fk: 'localColetaId', model: 'localColeta' },
} as const;

const tiposExcluiveis = ['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'motoristas', 'modelosCarreta'] as const;

// Motorista não tem tabela própria: vem dos veículos, listado como "NOME · CPF 123" (ou só "NOME").
function filtroMotorista(valor: string): Prisma.VeiculoWhereInput {
  const m = valor.match(/^(.*) · CPF (\S+)$/);
  return m ? { motoristaNome: m[1], motoristaCpf: m[2] } : { motoristaNome: valor, OR: [{ motoristaCpf: null }, { motoristaCpf: '' }] };
}

async function filtroLiberacoesDaReferencia(tipo: keyof typeof vinculosReferencia, valor: string) {
  const { campo, fk, model } = vinculosReferencia[tipo];
  const entidade: { id: number } | null = await (prisma as any)[model].findFirst({ where: { nome: valor } });
  const filtro: any = { OR: [{ [campo]: valor }, ...(entidade ? [{ [fk]: entidade.id }] : [])] };
  return { entidade, filtro };
}

// Onde uma referência está sendo usada — mostrado antes de excluir, para o
// usuário corrigir os dados (editar/transferir) quando houver vínculo.
export async function usoReferencia(req: AuthRequest, res: Response) {
  const query = z.object({ tipo: z.enum(tiposExcluiveis), valor: z.string().min(1) }).parse(req.query);
  const liberacaoSelect = { id: true, instrucao: true, status: true } as const;

  if (query.tipo === 'motoristas') {
    const veiculos = await prisma.veiculo.findMany({
      where: filtroMotorista(query.valor),
      select: { id: true, placa: true, status: true, liberacao: { select: liberacaoSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ liberacoes: [], veiculos, usuarios: [] });
  }
  if (query.tipo === 'modelosCarreta') {
    const veiculos = await prisma.veiculo.findMany({
      where: { modeloCarreta: { nomeDescricao: query.valor } },
      select: { id: true, placa: true, status: true, liberacao: { select: liberacaoSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ liberacoes: [], veiculos, usuarios: [] });
  }

  const { entidade, filtro } = await filtroLiberacoesDaReferencia(query.tipo, query.valor);
  const [liberacoes, usuarios] = await Promise.all([
    prisma.liberacao.findMany({ where: filtro, select: liberacaoSelect, orderBy: { createdAt: 'desc' } }),
    query.tipo === 'filiais' && entidade
      ? prisma.usuario.findMany({ where: { filialId: entidade.id }, select: { id: true, nome: true, email: true } })
      : [],
  ]);
  return res.json({ liberacoes, veiculos: [], usuarios });
}

async function excluirMotorista(valor: string, substituto: string | undefined) {
  const filtro = filtroMotorista(valor);
  const emUso = await prisma.veiculo.count({ where: filtro });
  if (emUso === 0) return 0;
  if (!substituto) {
    throw new AppError(`Em uso por ${emUso} veículo(s). Corrija os dados ou escolha um substituto antes de excluir.`, 400, 'HAS_DEPENDENCIES');
  }
  const destino = await prisma.veiculo.findFirst({ where: filtroMotorista(substituto), orderBy: { createdAt: 'desc' } });
  if (!destino) throw new AppError('Motorista substituto não encontrado', 404, 'NOT_FOUND');
  const resultado = await prisma.veiculo.updateMany({
    where: filtro,
    data: { motoristaNome: destino.motoristaNome, motoristaCpf: destino.motoristaCpf, motoristaTelefone: destino.motoristaTelefone, motoristaEmail: destino.motoristaEmail },
  });
  return resultado.count;
}

// Modelo de carreta: vários registros podem ter o mesmo nome (cada um guarda
// placa/capacidade de um veículo). Sem uso, os registros são apagados; com
// substituto, só são renomeados para ele — unifica o nome sem perder os dados.
async function excluirModeloCarreta(valor: string, substituto: string | undefined) {
  const emUso = await prisma.veiculo.count({ where: { modeloCarreta: { nomeDescricao: valor } } });
  if (emUso > 0 && !substituto) {
    throw new AppError(`Em uso por ${emUso} veículo(s). Corrija os dados ou escolha um substituto antes de excluir.`, 400, 'HAS_DEPENDENCIES');
  }
  if (substituto) {
    await prisma.modeloCarreta.updateMany({ where: { nomeDescricao: valor }, data: { nomeDescricao: substituto } });
    return emUso;
  }
  const removidos = await prisma.modeloCarreta.deleteMany({ where: { nomeDescricao: valor } });
  if (removidos.count === 0) throw new AppError('Modelo de carreta não encontrado', 404, 'NOT_FOUND');
  return 0;
}

// Exclui uma referência (ex: filial duplicada). Se estiver em uso, as liberações
// (e usuários, no caso de filial) são movidas para o `substituto` antes.
export async function excluirReferencia(req: AuthRequest, res: Response) {
  const body = z.object({
    tipo: z.enum(tiposExcluiveis),
    valor: z.string().min(1),
    substituto: z.string().trim().min(2).optional(),
  }).parse(req.body);
  if (body.substituto && body.substituto === body.valor) {
    throw new AppError('O substituto deve ser diferente do item excluído', 400);
  }
  if (body.tipo === 'motoristas') {
    return res.json({ transferidos: await excluirMotorista(body.valor, body.substituto) });
  }
  if (body.tipo === 'modelosCarreta') {
    return res.json({ transferidos: await excluirModeloCarreta(body.valor, body.substituto) });
  }
  const { campo, fk, model } = vinculosReferencia[body.tipo];

  const { entidade: entidadeAtual, filtro: filtroLiberacoes } = await filtroLiberacoesDaReferencia(body.tipo, body.valor);
  const [liberacoesEmUso, usuariosEmUso, referenciaCadastrada] = await Promise.all([
    prisma.liberacao.count({ where: filtroLiberacoes }),
    body.tipo === 'filiais' && entidadeAtual ? prisma.usuario.count({ where: { filialId: entidadeAtual.id } }) : 0,
    prisma.referenciaCadastro.count({ where: { tipo: body.tipo, valor: body.valor } }),
  ]);

  if (!entidadeAtual && liberacoesEmUso + referenciaCadastrada === 0) {
    throw new AppError('Referência não encontrada', 404, 'NOT_FOUND');
  }
  if (liberacoesEmUso + usuariosEmUso > 0 && !body.substituto) {
    throw new AppError(
      `Em uso por ${liberacoesEmUso} liberação(ões)${usuariosEmUso ? ` e ${usuariosEmUso} usuário(s)` : ''}. Escolha um substituto para transferi-los antes de excluir.`,
      400,
      'HAS_DEPENDENCIES',
    );
  }

  let novoId: number | undefined;
  let novoNome: string | undefined;
  if (body.substituto) {
    const dadosSubstituto: any = { [campo]: body.substituto };
    novoId = (await resolverCadastros(dadosSubstituto, true))[fk];
    novoNome = dadosSubstituto[campo];
    if (entidadeAtual && novoId === entidadeAtual.id) {
      throw new AppError('O substituto deve ser diferente do item excluído', 400);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (novoId) {
      await tx.liberacao.updateMany({ where: filtroLiberacoes, data: { [campo]: novoNome, [fk]: novoId } });
      if (body.tipo === 'filiais' && entidadeAtual) {
        await tx.usuario.updateMany({ where: { filialId: entidadeAtual.id }, data: { filialId: novoId } });
      }
    }
    await tx.referenciaCadastro.deleteMany({ where: { tipo: body.tipo, valor: body.valor } });
    // Filial só tem vínculo com liberações e usuários (já transferidos acima).
    if (body.tipo === 'filiais' && entidadeAtual) {
      await tx.origem.delete({ where: { id: entidadeAtual.id } });
    }
  });

  // Demais cadastros podem ter outros vínculos (ex: alertas); se sobrar algum,
  // o registro fica, mas some da lista de referências do mesmo jeito.
  if (body.tipo !== 'filiais' && entidadeAtual) {
    await (prisma as any)[model].delete({ where: { id: entidadeAtual.id } }).catch(() => undefined);
  }

  return res.json({ transferidos: novoId ? liberacoesEmUso : 0 });
}

export async function atualizarReferencia(req: AuthRequest, res: Response) {
  const body = z.object({ tipo: z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'modelosCarreta', 'motoristas']), atual: z.string().min(1), novo: z.string().min(2) }).parse(req.body);
  exigirAdminParaFiliais(req, body.tipo);
  if (body.tipo === 'modelosCarreta') {
    const resultado = await prisma.modeloCarreta.updateMany({ where: { nomeDescricao: body.atual }, data: { nomeDescricao: body.novo.trim() } });
    return res.json({ atualizados: resultado.count });
  }
  if (body.tipo === 'motoristas') {
    // Aceita "NOME" ou "NOME · CPF 123" — o segundo permite corrigir motorista
    // que ficou sem CPF (ex: CPF digitado no campo do nome).
    const novo = body.novo.trim().match(/^(.*?)\s*·\s*CPF\s+(\d+)$/);
    const data = novo ? { motoristaNome: novo[1].trim(), motoristaCpf: novo[2] } : { motoristaNome: body.novo.trim() };
    const resultado = await prisma.veiculo.updateMany({ where: filtroMotorista(body.atual), data });
    if (resultado.count === 0) throw new AppError('Motorista não encontrado', 404, 'NOT_FOUND');
    return res.json({ atualizados: resultado.count });
  }
  const campo = vinculosReferencia[body.tipo].campo;
  const novoValor = body.novo.trim();
  const filialAtual = body.tipo === 'filiais' ? await prisma.origem.findFirst({ where: { nome: body.atual } }) : null;
  if (body.tipo === 'filiais') {
    const conflito = await prisma.origem.findFirst({ where: { nome: { equals: novoValor, mode: 'insensitive' } } });
    if (conflito && conflito.id !== filialAtual?.id) {
      throw new AppError(`Já existe a filial "${conflito.nome}". Para unificar, exclua "${body.atual}" e escolha "${conflito.nome}" como substituta.`, 409, 'DUPLICATE');
    }
  }
  const resultado = await prisma.$transaction(async (tx) => {
    if (filialAtual) await tx.origem.update({ where: { id: filialAtual.id }, data: { nome: novoValor } });
    const liberacoes = await tx.liberacao.updateMany({ where: { [campo]: body.atual }, data: { [campo]: novoValor } });
    const referenciaAtual = await tx.referenciaCadastro.findUnique({ where: { tipo_valor: { tipo: body.tipo, valor: body.atual } } });

    if (!referenciaAtual) return { liberacoes: liberacoes.count, referencias: 0 };

    const referenciaComNovoValor = await tx.referenciaCadastro.findUnique({ where: { tipo_valor: { tipo: body.tipo, valor: novoValor } } });
    if (referenciaComNovoValor) {
      await tx.referenciaCadastro.delete({ where: { id: referenciaAtual.id } });
    } else {
      await tx.referenciaCadastro.update({ where: { id: referenciaAtual.id }, data: { valor: novoValor } });
    }

    return { liberacoes: liberacoes.count, referencias: 1 };
  });

  if (resultado.liberacoes + resultado.referencias === 0) {
    throw new AppError('Referência não encontrada para atualização', 404);
  }
  return res.json({ atualizados: resultado.liberacoes + resultado.referencias });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const liberacao = await prisma.liberacao.findUnique({
    where: { id: parseInt(id) },
    include: {
      cliente: true,
      origem: true,
      destino: true,
      terminal: true,
      localColeta: true,
      veiculos: {
        include: {
          modeloCarreta: true,
          transportadora: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'NOT_FOUND');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(liberacao.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diasParaDeadline = Math.ceil(
    (deadlineDate.getTime() - hoje.getTime()) / 86400000,
  );
  
  const carregado = liberacao.veiculos.reduce((s, v) => s + v.qtdFardos, 0);

  // Quem mexeu por último em cada veículo (status, SM, dados) — vem da auditoria.
  const ultimasAlteracoes = await prisma.auditoriaLog.findMany({
    where: { tabelaAfetada: 'Veiculo', registroId: { in: liberacao.veiculos.map((v) => v.id) } },
    distinct: ['registroId'],
    orderBy: { createdAt: 'desc' },
    select: {
      registroId: true, acao: true, camposAlterados: true, createdAt: true,
      usuario: { select: { id: true, nome: true } },
    },
  });
  const ultimaPorVeiculo = new Map(ultimasAlteracoes.map((a) => [a.registroId, a]));
  const veiculos = liberacao.veiculos.map((v) => {
    const ultima = ultimaPorVeiculo.get(v.id);
    return {
      ...v,
      ultimaAlteracao: ultima
        ? { usuario: ultima.usuario, em: ultima.createdAt, acao: ultima.acao, campos: ultima.camposAlterados?.split(',') ?? [] }
        : null,
    };
  });

  return res.json({
    ...liberacao,
    veiculos,
    carregado, 
    saldo: liberacao.totalFardos - carregado, 
    diasParaDeadline,
    aguardandoFechamento: situacaoFechamento(liberacao, liberacao.veiculos).aguardandoFechamento,
  });
}

export async function criar(req: AuthRequest, res: Response) {
  const recebido = criarSchema.parse(req.body);
  const cadastros = await resolverCadastros(recebido, req.user?.perfil === 'ADMIN');
  if (Object.values(cadastros).some((valor) => !valor)) {
    throw new AppError('Preencha Cliente, Filial, Destino, Origem e Local de Coleta', 400);
  }
  const data: any = { ...recebido, ...cadastros };

  // Validar se instrução já existe
  const existe = await prisma.liberacao.findUnique({ where: { instrucao: data.instrucao } });
  if (existe) throw new AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');

  // Validar se cliente existe
  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) throw new AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');

  // Validar se origem existe
  const origem = await prisma.origem.findUnique({ where: { id: data.origemId } });
  if (!origem) throw new AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');

  // Validar se destino existe
  const destino = await prisma.destino.findUnique({ where: { id: data.destinoId } });
  if (!destino) throw new AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');

  // Validar se terminal existe
  const terminal = await prisma.terminal.findUnique({ where: { id: data.terminalId } });
  if (!terminal) throw new AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');

  // Validar se localColeta existe
  const localColeta = await prisma.localColeta.findUnique({ where: { id: data.localColetaId } });
  if (!localColeta) throw new AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');

  const { clienteNome, filialNome, destinoNome, origemNome, localColetaNome, ...dadosLiberacao } = data;
  const liberacao = await prisma.liberacao.create({
    data: {
      ...dadosLiberacao,
      clienteNome: data.clienteNome,
      filialNome: data.filialNome,
      destinoNome: data.destinoNome,
      origemNome: data.origemNome,
      localColetaNome: data.localColetaNome,
      dataLiberacao: new Date(data.dataLiberacao),
      dataColeta: new Date(data.dataColeta),
      deadline: new Date(data.deadline),
      freteEmpresa: data.freteEmpresa,
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
    },
  });

  return res.status(201).json(liberacao);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const recebido = criarSchema.partial().parse(req.body);
  const cadastros = await resolverCadastros(recebido, req.user?.perfil === 'ADMIN');
  const data: any = { ...recebido, ...cadastros };

  // Validar se liberação existe
  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  // Validar se é uma instrução duplicada (se mudou a instrução)
  if (data.instrucao && data.instrucao !== liberacao.instrucao) {
    const existe = await prisma.liberacao.findUnique({ where: { instrucao: data.instrucao } });
    if (existe) throw new AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');
  }

  // Validar referências caso estejam sendo alteradas
  if (data.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');
  }

  if (data.origemId) {
    const origem = await prisma.origem.findUnique({ where: { id: data.origemId } });
    if (!origem) throw new AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');
  }

  if (data.destinoId) {
    const destino = await prisma.destino.findUnique({ where: { id: data.destinoId } });
    if (!destino) throw new AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');
  }

  if (data.terminalId) {
    const terminal = await prisma.terminal.findUnique({ where: { id: data.terminalId } });
    if (!terminal) throw new AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');
  }

  if (data.localColetaId) {
    const localColeta = await prisma.localColeta.findUnique({ where: { id: data.localColetaId } });
    if (!localColeta) throw new AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');
  }

  const liberacaoAtualizada = await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: {
      ...(() => {
        const { clienteNome, filialNome, destinoNome, origemNome, localColetaNome, ...dadosLiberacao } = data;
        return dadosLiberacao;
      })(),
      clienteNome: data.clienteNome,
      filialNome: data.filialNome,
      destinoNome: data.destinoNome,
      origemNome: data.origemNome,
      localColetaNome: data.localColetaNome,
      dataLiberacao: data.dataLiberacao ? new Date(data.dataLiberacao) : undefined,
      dataColeta: data.dataColeta ? new Date(data.dataColeta) : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
      localColeta: { select: { id: true, nome: true } },
    },
  });

  // Total de fardos pode ter mudado — conclui/reabre conforme a regra de saldo.
  await reavaliarStatusLiberacao(liberacaoAtualizada.id);

  return res.json(liberacaoAtualizada);
}

export async function deletar(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: { status: StatusLiberacao.CANCELADA },
  });

  return res.json({ message: 'Liberação cancelada com sucesso' });
}

export async function atualizarStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  // Validar status
  if (!Object.values(StatusLiberacao).includes(status)) {
    throw new AppError(`Status inválido: ${status}`, 400, 'INVALID_STATUS');
  }

  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  const atualizada = await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: { status },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
      localColeta: { select: { id: true, nome: true } },
    },
  });

  return res.json(atualizada);
}

// Fechamento manual (somente ADMIN): todos os veículos finalizados, mas ainda
// com fardos pendentes — a regra automática não conclui nesse caso.
export async function finalizarManual(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { motivo } = z.object({ motivo: z.string().trim().max(500).optional() }).parse(req.body ?? {});

  const liberacao = await prisma.liberacao.findUnique({
    where: { id },
    include: { veiculos: { select: { status: true, qtdFardos: true } } },
  });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
  if (liberacao.status !== StatusLiberacao.ATIVA) {
    throw new AppError('Só é possível finalizar uma liberação ativa', 400, 'INVALID_STATUS');
  }

  const { saldo, todosFinalizados } = situacaoFechamento(liberacao, liberacao.veiculos);
  if (!todosFinalizados) {
    throw new AppError('Todos os veículos precisam estar FINALIZADOS antes de fechar a instrução', 400, 'VEICULOS_PENDENTES');
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.id }, select: { nome: true } });
  const atualizada = await prisma.liberacao.update({
    where: { id },
    data: saldo > 0
      ? {
          status: StatusLiberacao.CONCLUIDA,
          fechamentoManual: true,
          fardosPendentesFechamento: saldo,
          motivoFechamento: motivo || null,
          fechamentoManualPor: usuario?.nome ?? null,
          fechamentoManualEm: new Date(),
        }
      // Sem saldo pendente é a conclusão normal.
      : { status: StatusLiberacao.CONCLUIDA },
  });

  return res.json(atualizada);
}
