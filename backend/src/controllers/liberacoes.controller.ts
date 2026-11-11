import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { StatusLiberacao, TipoFardo, Prisma } from '@prisma/client';
import {
  SELECT_VEICULO_FECHAMENTO,
  reavaliarStatusLiberacao,
  situacaoFechamento,
  toleranciaPesoFechamento,
} from '../services/liberacao-status';
import { similares } from '../services/cadastros-duplicados';

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
  localEntregaId: z.number().int().positive().optional(),
  // Opcional; vazio = limpar o local de entrega.
  localEntregaNome: z.string().trim().nullable().optional(),
  freteEmpresa: z.number().positive(),
  freteMotorista: z.number().nonnegative().nullable().optional(),
  totalFardos: z.number().int().positive(),
  // Toneladas. Obrigatório ao criar; instruções antigas podem estar sem.
  pesoTotal: z.number().positive().max(100000),
  tipoFardo: z.nativeEnum(TipoFardo).default(TipoFardo.FARDAO),
  deadline: z.string(),
  observacao: z.string().optional(),
  // Usuário já foi avisado do local de coleta parecido e confirmou que é outro.
  confirmarLocalColetaSimilar: z.boolean().optional(),
  confirmarLocalEntregaSimilar: z.boolean().optional(),
});

// Cada tipo de referência: campo texto na Liberação, FK correspondente e o model do cadastro.
const vinculosReferencia = {
  clientes: { campo: 'clienteNome', fk: 'clienteId', model: 'cliente' },
  filiais: { campo: 'filialNome', fk: 'origemId', model: 'origem' },
  destinos: { campo: 'destinoNome', fk: 'destinoId', model: 'destino' },
  origens: { campo: 'origemNome', fk: 'terminalId', model: 'terminal' },
  locaisColeta: { campo: 'localColetaNome', fk: 'localColetaId', model: 'localColeta' },
  locaisEntrega: { campo: 'localEntregaNome', fk: 'localEntregaId', model: 'localEntrega' },
} as const;
type TipoReferencia = keyof typeof vinculosReferencia;

const rotulosReferencia: Record<TipoReferencia, string> = {
  clientes: 'Cliente',
  filiais: 'Filial embarcadora',
  destinos: 'Destino',
  origens: 'Origem',
  locaisColeta: 'Local de coleta',
  locaisEntrega: 'Local de entrega',
};

// Campos obrigatórios de cada model ao criar o cadastro só com o nome.
const dadosNovoCadastro: Record<TipoReferencia, () => Record<string, unknown>> = {
  clientes: () => ({ cnpj: `PENDENTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }),
  filiais: () => ({ localizacao: 'Pendente', estado: '--' }),
  destinos: () => ({ estado: '--' }),
  origens: () => ({ tipoAcesso: 'EMAIL' }),
  locaisColeta: () => ({}),
  locaisEntrega: () => ({}),
};

// Todos os valores já conhecidos de um tipo: cadastro, referência avulsa
// (tela Revisão de Dados) e texto gravado nas liberações.
async function valoresReferencia(tipo: TipoReferencia): Promise<string[]> {
  const { campo, model } = vinculosReferencia[tipo];
  const [entidades, referencias, liberacoes] = await Promise.all([
    (prisma as any)[model].findMany({ select: { nome: true } }) as Promise<{ nome: string }[]>,
    prisma.referenciaCadastro.findMany({ where: { tipo }, select: { valor: true } }),
    (prisma.liberacao.findMany as any)({ distinct: [campo], select: { [campo]: true } }) as Promise<Record<string, string | null>[]>,
  ]);
  return [...new Set([
    ...entidades.map((e) => e.nome),
    ...referencias.map((r) => r.valor),
    ...liberacoes.map((l) => l[campo]?.trim() ?? ''),
  ].filter(Boolean))];
}

const mesmoValor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Locais de coleta e de entrega são livres pra qualquer perfil, mas avisam
// quando já existe um parecido.
const tiposLocalLivre = ['locaisColeta', 'locaisEntrega'] as const;
type TipoLocalLivre = (typeof tiposLocalLivre)[number];
const ehLocalLivre = (tipo: string): tipo is TipoLocalLivre => (tiposLocalLivre as readonly string[]).includes(tipo);

function erroLocalSimilar(tipo: TipoLocalLivre, valor: string, parecidos: string[]) {
  return new AppError(
    `Já existe ${rotulosReferencia[tipo].toLowerCase()} parecido com "${valor}": ${parecidos.join(', ')}`,
    409,
    tipo === 'locaisColeta' ? 'LOCAL_COLETA_SIMILAR' : 'LOCAL_ENTREGA_SIMILAR',
    { valor, similares: parecidos },
  );
}

// Cliente, filial, destino e origem novos só podem ser criados por ADMIN — os
// demais perfis só escolhem um valor que já existe (pra não surgir "SORRISO-MT"
// e "SORRISO - MT" como cadastros diferentes). Locais de coleta e de entrega são
// abertos a todos, mas se já houver um parecido o usuário precisa confirmar
// (`confirmarSimilar` / `confirmarEntregaSimilar`) que quer mesmo criar outro.
async function resolverCadastros(data: any, opcoes: { podeCriar: boolean; confirmarSimilar?: boolean; confirmarEntregaSimilar?: boolean }) {
  const resolver = async (tipo: TipoReferencia, id: number | undefined, nome: string | undefined) => {
    if (id) return id;
    const valor = nome?.trim();
    if (!valor) return undefined;
    const { campo, model } = vinculosReferencia[tipo];
    const delegate = (prisma as any)[model];

    const item = await delegate.findFirst({ where: { nome: { equals: valor, mode: 'insensitive' } } });
    if (item) {
      data[campo] = item.nome;
      return item.id as number;
    }

    // Valor já conhecido (referência avulsa ou liberação antiga) sem cadastro:
    // materializar o cadastro não é "criar dado novo", vale pra qualquer perfil.
    const existentes = await valoresReferencia(tipo);
    const registrado = existentes.find((v) => mesmoValor(v, valor));
    if (!registrado) {
      if (ehLocalLivre(tipo)) {
        const confirmado = tipo === 'locaisColeta' ? opcoes.confirmarSimilar : opcoes.confirmarEntregaSimilar;
        const parecidos = similares(valor, existentes);
        if (parecidos.length && !confirmado) throw erroLocalSimilar(tipo, valor, parecidos);
      } else if (!opcoes.podeCriar) {
        throw new AppError(
          `${rotulosReferencia[tipo]} "${valor}" não está cadastrado(a). Selecione um da lista ou peça a um administrador para cadastrá-lo.`,
          403,
          'CADASTRO_SOMENTE_ADMIN',
        );
      }
    }
    data[campo] = registrado ?? valor;
    return (await delegate.create({ data: { nome: data[campo], ...dadosNovoCadastro[tipo]() } })).id as number;
  };

  return {
    clienteId: await resolver('clientes', data.clienteId, data.clienteNome),
    origemId: await resolver('filiais', data.origemId, data.filialNome),
    destinoId: await resolver('destinos', data.destinoId, data.destinoNome),
    terminalId: await resolver('origens', data.terminalId, data.origemNome),
    localColetaId: await resolver('locaisColeta', data.localColetaId, data.localColetaNome),
    // Opcional: sem o campo = não mexe; vazio/null = limpa o local de entrega.
    localEntregaId: data.localEntregaNome !== undefined && !data.localEntregaNome && !data.localEntregaId
      ? ((data.localEntregaNome = null), null)
      : await resolver('locaisEntrega', data.localEntregaId, data.localEntregaNome),
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
  if (status && !Object.values(StatusLiberacao).includes(status as StatusLiberacao)) {
    throw new AppError(`Status inválido: ${status}`, 400, 'INVALID_STATUS');
  }

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

  // Busca em todas as colunas da tela (campos denormalizados + relação, porque
  // cadastros antigos podem ter o nome divergente). Placa/motorista só de veículo ativo.
  if (busca) {
    const contem = { contains: busca.trim(), mode: 'insensitive' as const };
    where.OR = [
      { instrucao: contem },
      { clienteNome: contem }, { cliente: { nome: contem } },
      { origemNome: contem }, { terminal: { nome: contem } },
      { localColetaNome: contem }, { localColeta: { nome: contem } },
      { destinoNome: contem }, { destino: { nome: contem } },
      { localEntregaNome: contem }, { localEntrega: { nome: contem } },
      { veiculos: { some: { ativo: true, OR: [{ placa: contem }, { motoristaNome: contem }] } } },
    ];
  }

  const [total, items, todasDoFiltro, programadoFiltro] = await Promise.all([
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
        localEntrega: { select: { id: true, nome: true } },
        veiculos: {
          select: {
            ...SELECT_VEICULO_FECHAMENTO,
            motoristaNome: true, motoristaTelefone: true,
            modeloCarreta: { select: { id: true, nomeDescricao: true } },
          },
        },
      },
      orderBy: { deadline: 'asc' },
    }),
    // Totais de tudo o que o filtro traz (não só a página) — faixa no topo da lista.
    prisma.liberacao.findMany({
      where,
      select: { totalFardos: true, pesoTotal: true, carregado: true, deadline: true, status: true },
    }),
    prisma.veiculo.aggregate({ where: { ativo: true, liberacao: where }, _sum: { qtdFardos: true } }),
  ]);
  const tolerancia = await toleranciaPesoFechamento();

  // Calcula saldo e dias para deadline
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const data = items.map((l) => {
    const deadlineDate = new Date(l.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diasParaDeadline = Math.ceil(
      (deadlineDate.getTime() - hoje.getTime()) / 86400000,
    );
    const sit = situacaoFechamento(l, l.veiculos, tolerancia);
    return {
      ...l,
      programado: sit.programado,
      carregado: sit.carregado,
      saldo: sit.saldoProgramar,
      saldoCarregar: sit.saldoCarregar,
      toneladasCarregadas: sit.toneladasCarregadas,
      situacao: sit.situacao,
      // Deadline é de carregamento: tudo carregado = prazo cumprido (não mostra vencido).
      prazoCumprido: sit.saldoCarregar <= 0,
      diasParaDeadline,
      aguardandoFechamento: sit.aguardandoFechamento,
      totalPendencias: sit.pendencias.length,
    };
  });

  const totalFardos = todasDoFiltro.reduce((s, l) => s + l.totalFardos, 0);
  const programado = programadoFiltro._sum.qtdFardos ?? 0;
  const carregado = todasDoFiltro.reduce((s, l) => s + l.carregado, 0);
  const totais = {
    liberacoes: total,
    totalFardos,
    programado,
    carregado,
    saldoProgramar: totalFardos - programado,
    saldoCarregar: totalFardos - carregado,
    pesoTotal: todasDoFiltro.reduce((s, l) => s + (l.pesoTotal ?? 0), 0),
    semPeso: todasDoFiltro.filter((l) => l.pesoTotal == null).length,
    // Vencida = ativa, deadline passado e ainda com fardo a carregar.
    vencidas: todasDoFiltro.filter((l) => l.status === StatusLiberacao.ATIVA && l.deadline < hoje && l.carregado < l.totalFardos).length,
  };

  return res.json({ data, total, totais, page: parseInt(page), limit: take });
}

export async function referencias(_req: AuthRequest, res: Response) {
  const [liberacoes, cadastradas, veiculos, filiais, modelos] = await Promise.all([prisma.liberacao.findMany({
    select: { clienteNome: true, filialNome: true, destinoNome: true, origemNome: true, localColetaNome: true, localEntregaNome: true },
  }), prisma.referenciaCadastro.findMany({ select: { tipo: true, valor: true } }), prisma.veiculo.findMany({ include: { modeloCarreta: { select: { nomeDescricao: true } } } }),
  prisma.origem.findMany({ select: { nome: true } }), prisma.modeloCarreta.findMany({ select: { nomeDescricao: true } })]);
  // Filiais cadastradas (model Origem) também entram na lista, mesmo sem liberação — são as mesmas do filtro da tela de Liberações.
  cadastradas.push(...filiais.map((f) => ({ tipo: 'filiais', valor: f.nome })));
  const valores = (campo: keyof (typeof liberacoes)[number], tipo: string) =>
    [...new Set([...liberacoes.map((item) => item[campo]?.trim()), ...cadastradas.filter((item) => item.tipo === tipo).map((item) => item.valor)].filter(Boolean))].sort();

  return res.json({
    clientes: valores('clienteNome', 'clientes'), filiais: valores('filialNome', 'filiais'), destinos: valores('destinoNome', 'destinos'), origens: valores('origemNome', 'origens'), locaisColeta: valores('localColetaNome', 'locaisColeta'), locaisEntrega: valores('localEntregaNome', 'locaisEntrega'),
    // Todos os modelos cadastrados (não só os usados em veículos), para os sem uso poderem ser excluídos.
    modelosCarreta: [...new Set(modelos.map((item) => item.nomeDescricao?.trim()).filter(Boolean))].sort(),
    // Nomes já digitados em "Captação" (sugestão no Informe).
    captacoes: [...new Set(veiculos.map((item) => item.captacao?.trim()).filter((v): v is string => !!v))].sort(),
    // Opções cadastráveis (só ADMIN cria) + valores já gravados em veículos.
    formasPagamento: [...new Set([
      ...cadastradas.filter((item) => item.tipo === 'formasPagamento').map((item) => item.valor),
      ...veiculos.map((item) => item.formaPagamento?.trim()).filter((v): v is string => !!v),
    ])].sort(),
    motoristas: [...new Set(veiculos.map((item) => item.motoristaCpf ? `${item.motoristaNome} · CPF ${item.motoristaCpf}` : item.motoristaNome).filter(Boolean))].sort(),
  });
}

function exigirAdminParaFiliais(req: AuthRequest, tipo: string) {
  if (tipo === 'filiais' && req.user?.perfil !== 'ADMIN') {
    throw new AppError('Somente administradores podem gerenciar filiais embarcadoras', 403, 'FORBIDDEN');
  }
}

export async function criarReferencia(req: AuthRequest, res: Response) {
  const data = z.object({
    tipo: z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'locaisEntrega', 'formasPagamento']),
    valor: z.string().min(2),
    // Usuário já foi avisado do local de coleta/entrega parecido e confirmou que é outro.
    confirmarSimilar: z.boolean().optional(),
  }).parse(req.body);
  const valor = data.valor.trim();
  if (data.tipo === 'formasPagamento') {
    if (req.user?.perfil !== 'ADMIN') throw new AppError('Somente administradores podem cadastrar formas de pagamento', 403, 'CADASTRO_SOMENTE_ADMIN');
    const existentes = await prisma.referenciaCadastro.findMany({ where: { tipo: data.tipo } });
    const igual = existentes.find((r) => mesmoValor(r.valor, valor));
    if (igual) throw new AppError(`Forma de pagamento "${igual.valor}" já está cadastrada`, 409, 'DUPLICATE');
    return res.status(201).json(await prisma.referenciaCadastro.create({ data: { tipo: data.tipo, valor } }));
  }
  if (!ehLocalLivre(data.tipo) && req.user?.perfil !== 'ADMIN') {
    throw new AppError(`Somente administradores podem cadastrar ${rotulosReferencia[data.tipo].toLowerCase()}`, 403, 'CADASTRO_SOMENTE_ADMIN');
  }
  const existentes = await valoresReferencia(data.tipo);
  const igual = existentes.find((v) => mesmoValor(v, valor));
  if (igual) throw new AppError(`${rotulosReferencia[data.tipo]} "${igual}" já está cadastrado(a)`, 409, 'DUPLICATE');
  if (ehLocalLivre(data.tipo) && !data.confirmarSimilar) {
    const parecidos = similares(valor, existentes);
    if (parecidos.length) throw erroLocalSimilar(data.tipo, valor, parecidos);
  }
  if (data.tipo === 'filiais') {
    await prisma.origem.create({ data: { nome: valor, localizacao: 'Pendente', estado: '--' } });
  }
  const referencia = await prisma.referenciaCadastro.upsert({ where: { tipo_valor: { tipo: data.tipo, valor } }, update: {}, create: { tipo: data.tipo, valor } });
  return res.status(201).json(referencia);
}

const tiposExcluiveis = ['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'locaisEntrega', 'motoristas', 'modelosCarreta', 'formasPagamento'] as const;

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
  if (query.tipo === 'modelosCarreta' || query.tipo === 'formasPagamento') {
    const veiculos = await prisma.veiculo.findMany({
      where: query.tipo === 'modelosCarreta' ? { modeloCarreta: { nomeDescricao: query.valor } } : { formaPagamento: query.valor },
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

// Forma de pagamento: só texto no veículo. Em uso, precisa de substituto.
async function excluirFormaPagamento(valor: string, substituto: string | undefined) {
  const emUso = await prisma.veiculo.count({ where: { formaPagamento: valor } });
  if (emUso > 0 && !substituto) {
    throw new AppError(`Em uso por ${emUso} veículo(s). Escolha um substituto antes de excluir.`, 400, 'HAS_DEPENDENCIES');
  }
  await prisma.$transaction(async (tx) => {
    if (emUso > 0) await tx.veiculo.updateMany({ where: { formaPagamento: valor }, data: { formaPagamento: substituto } });
    await tx.referenciaCadastro.deleteMany({ where: { tipo: 'formasPagamento', valor } });
  });
  return emUso;
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
  if (body.tipo === 'formasPagamento') {
    return res.json({ transferidos: await excluirFormaPagamento(body.valor, body.substituto) });
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
    novoId = (await resolverCadastros(dadosSubstituto, { podeCriar: true, confirmarSimilar: true, confirmarEntregaSimilar: true }))[fk] ?? undefined;
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
  const body = z.object({ tipo: z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'locaisEntrega', 'modelosCarreta', 'motoristas', 'formasPagamento']), atual: z.string().min(1), novo: z.string().min(2) }).parse(req.body);
  exigirAdminParaFiliais(req, body.tipo);
  if (body.tipo === 'formasPagamento') {
    if (req.user?.perfil !== 'ADMIN') throw new AppError('Somente administradores editam formas de pagamento', 403, 'FORBIDDEN');
    const novo = body.novo.trim();
    const resultado = await prisma.$transaction(async (tx) => {
      const veiculos = await tx.veiculo.updateMany({ where: { formaPagamento: body.atual }, data: { formaPagamento: novo } });
      const refs = await tx.referenciaCadastro.updateMany({ where: { tipo: body.tipo, valor: body.atual }, data: { valor: novo } });
      return veiculos.count + refs.count;
    });
    if (resultado === 0) throw new AppError('Forma de pagamento não encontrada', 404, 'NOT_FOUND');
    return res.json({ atualizados: resultado });
  }
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
      localEntrega: true,
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
  
  const sit = situacaoFechamento(liberacao, liberacao.veiculos, await toleranciaPesoFechamento());
  const pendenciasPorVeiculo = new Map(sit.pendenciasPorVeiculo.map((p) => [p.id, p.pendencias]));

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
      pendencias: pendenciasPorVeiculo.get(v.id) ?? [],
      ultimaAlteracao: ultima
        ? { usuario: ultima.usuario, em: ultima.createdAt, acao: ultima.acao, campos: ultima.camposAlterados?.split(',') ?? [] }
        : null,
    };
  });

  return res.json({
    ...liberacao,
    veiculos,
    programado: sit.programado,
    carregado: sit.carregado,
    saldo: sit.saldoProgramar,
    saldoCarregar: sit.saldoCarregar,
    toneladasCarregadas: sit.toneladasCarregadas,
    pesoMedioFardoKg: sit.pesoMedioFardoKg,
    pesoMedioRealKg: sit.pesoMedioRealKg,
    situacao: sit.situacao,
    prazoCumprido: sit.saldoCarregar <= 0,
    diasParaDeadline,
    aguardandoFechamento: sit.aguardandoFechamento,
    pendencias: sit.pendencias,
    pendenciasInstrucao: sit.pendenciasInstrucao,
  });
}

export async function criar(req: AuthRequest, res: Response) {
  const { confirmarLocalColetaSimilar, confirmarLocalEntregaSimilar, ...recebido } = criarSchema.parse(req.body);
  const cadastros = await resolverCadastros(recebido, { podeCriar: req.user?.perfil === 'ADMIN', confirmarSimilar: confirmarLocalColetaSimilar, confirmarEntregaSimilar: confirmarLocalEntregaSimilar });
  const { localEntregaId: _opcional, ...obrigatorios } = cadastros;
  if (Object.values(obrigatorios).some((valor) => !valor)) {
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

  const { clienteNome, filialNome, destinoNome, origemNome, localColetaNome, localEntregaNome, ...dadosLiberacao } = data;
  const liberacao = await prisma.liberacao.create({
    data: {
      ...dadosLiberacao,
      clienteNome: data.clienteNome,
      filialNome: data.filialNome,
      destinoNome: data.destinoNome,
      origemNome: data.origemNome,
      localColetaNome: data.localColetaNome,
      localEntregaNome: data.localEntregaNome,
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
  const { confirmarLocalColetaSimilar, confirmarLocalEntregaSimilar, ...recebido } = criarSchema.partial().parse(req.body);
  const cadastros = await resolverCadastros(recebido, { podeCriar: req.user?.perfil === 'ADMIN', confirmarSimilar: confirmarLocalColetaSimilar, confirmarEntregaSimilar: confirmarLocalEntregaSimilar });
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
        const { clienteNome, filialNome, destinoNome, origemNome, localColetaNome, localEntregaNome, ...dadosLiberacao } = data;
        return dadosLiberacao;
      })(),
      clienteNome: data.clienteNome,
      filialNome: data.filialNome,
      destinoNome: data.destinoNome,
      origemNome: data.origemNome,
      localColetaNome: data.localColetaNome,
      localEntregaNome: data.localEntregaNome,
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
      localEntrega: { select: { id: true, nome: true } },
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
  if (status === StatusLiberacao.SUSPENSA) {
    throw new AppError('Para suspender use "Suspender" (motivo obrigatório)', 400, 'INVALID_STATUS');
  }

  const liberacao = await prisma.liberacao.findUnique({ where: { id: parseInt(id) } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');

  const atualizada = await prisma.liberacao.update({
    where: { id: parseInt(id) },
    data: {
      status,
      concluidaEm: status === StatusLiberacao.CONCLUIDA ? liberacao.concluidaEm ?? new Date() : null,
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      origem: { select: { id: true, nome: true } },
      destino: { select: { id: true, nome: true } },
      terminal: { select: { id: true, nome: true } },
      localColeta: { select: { id: true, nome: true } },
      localEntrega: { select: { id: true, nome: true } },
    },
  });

  return res.json(atualizada);
}

// Fechamento manual (somente ADMIN): todos os veículos ativos finalizados, mas
// com pendência no checklist (saldo, peso, SM, isca...) — a regra automática não
// conclui nesse caso. Motivo obrigatório; o que faltava fica gravado.
export async function finalizarManual(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { motivo } = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo do fechamento').max(500) }).parse(req.body ?? {});

  const liberacao = await prisma.liberacao.findUnique({
    where: { id },
    include: { veiculos: { select: SELECT_VEICULO_FECHAMENTO } },
  });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
  if (liberacao.status !== StatusLiberacao.ATIVA) {
    throw new AppError('Só é possível finalizar uma liberação ativa', 400, 'INVALID_STATUS');
  }

  const sit = situacaoFechamento(liberacao, liberacao.veiculos, await toleranciaPesoFechamento());
  if (!sit.todosFinalizados) {
    throw new AppError('Todos os veículos ativos precisam estar FINALIZADOS antes de fechar a instrução', 400, 'VEICULOS_PENDENTES');
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.id }, select: { nome: true } });
  const atualizada = await prisma.liberacao.update({
    where: { id },
    data: sit.pendencias.length > 0
      ? {
          status: StatusLiberacao.CONCLUIDA,
          fechamentoManual: true,
          fardosPendentesFechamento: Math.max(0, sit.saldoProgramar),
          pendenciasFechamento: sit.pendencias.join('\n'),
          motivoFechamento: motivo,
          fechamentoManualPor: usuario?.nome ?? null,
          fechamentoManualEm: new Date(),
          concluidaEm: new Date(),
        }
      // Checklist completo é a conclusão normal.
      : { status: StatusLiberacao.CONCLUIDA, concluidaEm: new Date() },
  });

  return res.json(atualizada);
}

// Suspender (ADMIN / Gestor de filial): motivo obrigatório. Suspensa não gera
// alertas e sai dos KPIs de risco; veículos continuam podendo ser movimentados.
export async function suspender(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { motivo } = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo da suspensão').max(500) }).parse(req.body ?? {});
  const liberacao = await prisma.liberacao.findUnique({ where: { id } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
  if (liberacao.status !== StatusLiberacao.ATIVA) {
    throw new AppError('Só é possível suspender uma liberação ativa', 400, 'INVALID_STATUS');
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.id }, select: { nome: true } });
  const atualizada = await prisma.liberacao.update({
    where: { id },
    data: { status: StatusLiberacao.SUSPENSA, motivoSuspensao: motivo, suspensaPor: usuario?.nome ?? null, suspensaEm: new Date() },
  });
  return res.json(atualizada);
}

export async function reativarSuspensa(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const liberacao = await prisma.liberacao.findUnique({ where: { id } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
  if (liberacao.status !== StatusLiberacao.SUSPENSA) {
    throw new AppError('A liberação não está suspensa', 400, 'INVALID_STATUS');
  }
  await prisma.liberacao.update({
    where: { id },
    data: { status: StatusLiberacao.ATIVA, motivoSuspensao: null, suspensaPor: null, suspensaEm: null },
  });
  // Pode ter finalizado tudo enquanto estava suspensa.
  await reavaliarStatusLiberacao(id);
  return res.json(await prisma.liberacao.findUnique({ where: { id } }));
}

// Datas "só dia" (dataLiberacao, dataColeta, deadline) ficam à meia-noite UTC:
// usa o próprio dia UTC. Instantes (agendamento, carregamento...) vão no horário de Brasília.
const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10).split('-').reverse().join('/') : '');
const instante = (d: Date | null) => (d
  ? d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')
  : '');
const rotuloEnum = (v: string | null) => (v ? v.replace(/_/g, ' ') : '');

// Todas as viagens (veículos) lançadas, uma por linha, com os dados da liberação —
// exportado em .xlsx na tela Revisão de Dados.
export async function exportarViagens(_req: AuthRequest, res: Response) {
  const veiculos = await prisma.veiculo.findMany({
    include: {
      modeloCarreta: { select: { nomeDescricao: true } },
      transportadora: { select: { nome: true } },
      liberacao: {
        include: {
          cliente: { select: { nome: true } },
          origem: { select: { nome: true } },
          destino: { select: { nome: true } },
          terminal: { select: { nome: true } },
          localColeta: { select: { nome: true } },
          localEntrega: { select: { nome: true } },
        },
      },
    },
    orderBy: [{ liberacao: { dataLiberacao: 'desc' } }, { liberacaoId: 'asc' }, { createdAt: 'asc' }],
  });

  const cabecalho = [
    'Instrução', 'Status da liberação', 'Cliente', 'Filial embarcadora', 'Origem', 'Local de coleta', 'Destino', 'Local de entrega',
    'Data da liberação', 'Data de coleta', 'Deadline', 'Tipo de fardo', 'Total de fardos (liberação)', 'Frete empresa (R$/t)', 'Frete motorista liberação (R$/t)',
    'Peso da instrução (t)',
    'Placa', 'Tipo do veículo', 'Motorista', 'CPF', 'Telefone', 'Email', 'Transportadora',
    'Status do veículo', 'SM', 'Rastreamento', 'Possui isca', 'Isca', 'Forma de pagamento', 'Qtd. fardos', 'Peso carregado (t)', 'Frete motorista viagem (R$/t)',
    'Agendamento', 'Carregamento', 'Descarga', 'Finalizado em', 'Observação do veículo', 'Lançado em',
    'Veículo ativo', 'Motivo da inativação',
  ];
  const linhas = veiculos.map((v) => {
    const l = v.liberacao;
    return [
      l.instrucao, rotuloEnum(l.status), l.clienteNome ?? l.cliente?.nome, l.filialNome ?? l.origem?.nome, l.origemNome ?? l.terminal?.nome,
      l.localColetaNome ?? l.localColeta?.nome, l.destinoNome ?? l.destino?.nome, l.localEntregaNome ?? l.localEntrega?.nome ?? '',
      dia(l.dataLiberacao), dia(l.dataColeta), dia(l.deadline), rotuloEnum(l.tipoFardo), l.totalFardos, l.freteEmpresa, l.freteMotorista,
      l.pesoTotal ?? '',
      v.placa, v.modeloCarreta?.nomeDescricao ?? '', v.motoristaNome, v.motoristaCpf ?? '', v.motoristaTelefone, v.motoristaEmail ?? '', v.transportadora?.nome ?? '',
      rotuloEnum(v.status), rotuloEnum(v.statusSm), rotuloEnum(v.statusRastreamento),
      v.possuiIsca == null ? '' : v.possuiIsca ? 'Sim' : 'Não', v.numeroIsca ?? '', v.formaPagamento ?? '', v.qtdFardos, v.pesoCarregado, v.freteMotorista,
      instante(v.dataAgendamento), instante(v.dataCarregamento), instante(v.dataDescarga), instante(v.finalizadoEm), v.observacao ?? '', instante(v.createdAt),
      v.ativo ? 'Sim' : 'Não', v.motivoInativacao ?? '',
    ];
  });

  return res.json({ cabecalho, linhas });
}
