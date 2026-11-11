import { Response } from 'express';
import { z } from 'zod';
import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { StatusVeiculo, StatusSM, StatusRastreamento } from '@prisma/client';
import { reavaliarStatusLiberacao } from '../services/liberacao-status';
import {
  atualizarMotoristaExistente,
  motoristasParecidos,
  normalizar,
  resolverNomeModelo,
  somenteDigitos,
} from '../services/cadastros-duplicados';

const criarSchema = z.object({
  liberacaoId: z.number().int().positive(),
  placa: z.string().min(5).max(10),
  // Cadastro Base é o cadastro mestre; o veículo pode ser criado pela Liberação.
  modeloCarretaId: z.number().int().positive().optional(),
  nomeDescricao: z.string().min(3).optional(),
  capacidadeMaximaFardos: z.number().int().positive().optional(),
  pesoMaximoKg: z.number().int().positive().optional(),
  comprimentoM: z.number().positive().optional().nullable(),
  freteMotorista: z.number().positive(),
  qtdFardos: z.number().int().positive(),
  // Toneladas carregadas na viagem (opcional — NF/balança). A tela recebe em kg e converte.
  pesoCarregado: z.number().positive().nullable().optional(),
  motoristaNome: z.string().min(3),
  motoristaTelefone: z.string().min(10),
  // Há cadastros legados com CPF incompleto; não devem impedir a edição do veículo.
  motoristaCpf: z.string().min(10).max(11).nullable().optional(),
  motoristaEmail: z.string().email().optional(),
  transportadoraId: z.number().int().positive().optional(),
  status: z.nativeEnum(StatusVeiculo).optional().default(StatusVeiculo.AGUARDANDO_GR),
  statusSm: z.nativeEnum(StatusSM).optional().default(StatusSM.PENDENTE),
  statusRastreamento: z.nativeEnum(StatusRastreamento).optional().default(StatusRastreamento.PENDENTE),
  // null = não respondido; false = "Não possui isca"; true = possui (com número).
  possuiIsca: z.boolean().nullable().optional(),
  numeroIsca: z.string().optional().nullable(),
  // Informativo (conferência no ERP); opções em Revisão de Dados. Obrigatório ao
  // cadastrar; veículos antigos sem ela só travam o fechamento da instrução.
  formaPagamento: z.string().trim().min(1, 'Informe a forma de pagamento').max(100),
  // Informe (ordem do caminhão): comprimento livre (ex.: 12.35X12.35), altura em metros, captação = nome livre.
  comprimento: z.string().trim().max(40).nullable().optional(),
  altura: z.number().positive().max(10).nullable().optional(),
  captacao: z.string().trim().max(100).nullable().optional(),
  dataAgendamento: z.string().datetime({ offset: true }).optional().nullable(),
  dataCarregamento: z.string().datetime({ offset: true }).optional().nullable(),
  dataDescarga: z.string().datetime({ offset: true }).optional().nullable(),
  observacao: z.string().optional(),
});

type DadosVeiculo = z.infer<typeof criarSchema>;

// "Não possui isca" apaga o número; número informado sem resposta vale como "Sim".
function normalizarIsca<T extends { possuiIsca?: boolean | null; numeroIsca?: string | null }>(data: T): T {
  if (data.possuiIsca === false) return { ...data, numeroIsca: null };
  if (data.possuiIsca === undefined && data.numeroIsca?.trim()) return { ...data, possuiIsca: true };
  return data;
}

const motivoSchema = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo').max(500) });

async function nomeUsuario(req: AuthRequest) {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.id }, select: { nome: true } });
  return usuario?.nome ?? req.user?.email ?? null;
}

// Resposta do usuário ao aviso de motorista já cadastrado (MOTORISTA_EXISTENTE):
// "atualizar" aplica os dados digitados ao motorista escolhido; "novo" grava
// como motorista diferente mesmo parecido.
const decisaoMotoristaSchema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('novo') }),
  z.object({
    acao: z.literal('atualizar'),
    alvo: z.object({ nome: z.string(), telefone: z.string(), cpf: z.string().nullable() }),
  }),
]).optional();

async function verificarMotorista(
  dados: Pick<DadosVeiculo, 'motoristaNome' | 'motoristaTelefone' | 'motoristaCpf'>,
  decisao: z.infer<typeof decisaoMotoristaSchema>,
  ignorarVeiculoId?: number,
) {
  if (decisao?.acao === 'novo') return;
  if (decisao?.acao === 'atualizar') {
    await atualizarMotoristaExistente(decisao.alvo, dados);
    return;
  }
  const candidatos = await motoristasParecidos(dados, ignorarVeiculoId);
  if (candidatos.length) {
    throw new AppError('Já existe motorista parecido cadastrado no sistema', 409, 'MOTORISTA_EXISTENTE', { candidatos });
  }
}

async function vincularCadastroBase(data: DadosVeiculo, podeCriarModelo: boolean) {
  const placaVeiculo = data.placa.trim().toUpperCase();
  const dadosCadastro = {
    placaVeiculo,
    motoristaNome: data.motoristaNome,
    motoristaTelefone: data.motoristaTelefone,
    nomeDescricao: data.nomeDescricao,
    capacidadeMaximaFardos: data.capacidadeMaximaFardos,
    pesoMaximoKg: data.pesoMaximoKg,
    comprimentoM: data.comprimentoM ?? undefined,
  };
  let cadastro = data.modeloCarretaId
    ? await prisma.modeloCarreta.findUnique({ where: { id: data.modeloCarretaId } })
    : await prisma.modeloCarreta.findFirst({ where: { placaVeiculo } });

  // Só valida o modelo quando ele é novo nesse cadastro — manter o que já está gravado é sempre permitido.
  if (data.nomeDescricao && (!cadastro || normalizar(data.nomeDescricao) !== normalizar(cadastro.nomeDescricao))) {
    dadosCadastro.nomeDescricao = await resolverNomeModelo(data.nomeDescricao, podeCriarModelo);
  }

  if (cadastro) {
    cadastro = await prisma.modeloCarreta.update({
      where: { id: cadastro.id },
      data: {
        ...dadosCadastro,
        nomeDescricao: dadosCadastro.nomeDescricao ?? cadastro.nomeDescricao,
        capacidadeMaximaFardos: dadosCadastro.capacidadeMaximaFardos ?? cadastro.capacidadeMaximaFardos,
        pesoMaximoKg: dadosCadastro.pesoMaximoKg ?? cadastro.pesoMaximoKg,
      },
    });
  } else {
    if (!data.nomeDescricao) {
      throw new AppError('Informe o modelo da carreta para cadastrar um novo veículo', 400);
    }
    cadastro = await prisma.modeloCarreta.create({
      data: {
        ...dadosCadastro,
        nomeDescricao: dadosCadastro.nomeDescricao ?? data.nomeDescricao,
        capacidadeMaximaFardos: data.capacidadeMaximaFardos ?? 0,
        pesoMaximoKg: data.pesoMaximoKg ?? 0,
      },
    });
  }
  return { cadastro, placaVeiculo };
}

async function propagarCadastroBase(cadastro: { id: number; placaVeiculo: string | null; motoristaNome: string | null; motoristaTelefone: string | null }) {
  await prisma.veiculo.updateMany({
    where: { modeloCarretaId: cadastro.id },
    data: {
      ...(cadastro.placaVeiculo ? { placa: cadastro.placaVeiculo } : {}),
      ...(cadastro.motoristaNome ? { motoristaNome: cadastro.motoristaNome } : {}),
      ...(cadastro.motoristaTelefone ? { motoristaTelefone: cadastro.motoristaTelefone } : {}),
    },
  });
}

export async function listar(req: AuthRequest, res: Response) {
  const { 
    liberacaoId, status, placa, motorista,
    page = '1', limit = '100'
  } = req.query as Record<string, string>;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (liberacaoId) where.liberacaoId = parseInt(liberacaoId);
  if (status) where.status = status as StatusVeiculo;
  if (placa) where.placa = { contains: placa, mode: 'insensitive' };
  if (motorista) {
    where.OR = [
      { motoristaNome: { contains: motorista, mode: 'insensitive' } },
      { motoristaTelefone: { contains: motorista } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.veiculo.count({ where }),
    prisma.veiculo.findMany({
      where,
      skip,
      take,
      include: {
        liberacao: {
          select: {
            id: true,
            instrucao: true,
            deadline: true,
            totalFardos: true,
            carregado: true,
            cliente: { select: { id: true, nome: true } },
            origem: { select: { id: true, nome: true } },
            terminal: { select: { id: true, nome: true } },
          },
        },
        modeloCarreta: true,
        transportadora: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return res.json({ data: items, total, page: parseInt(page), limit: take });
}

export async function buscarPorId(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const veiculo = await prisma.veiculo.findUnique({
    where: { id: parseInt(id) },
    include: {
      liberacao: {
        include: {
          cliente: true,
          origem: true,
          terminal: true,
        },
      },
      modeloCarreta: true,
      transportadora: true,
    },
  });

  if (!veiculo) throw new AppError('Veículo não encontrado', 404);
  return res.json(veiculo);
}

export async function buscarPorPlaca(req: AuthRequest, res: Response) {
  const { placa } = req.params;
  const placaVeiculo = placa.trim().toUpperCase();

  const cadastro = await prisma.modeloCarreta.findFirst({ where: { placaVeiculo } });
  // Comprimento/altura da última viagem com a mesma placa (pré-preenche o Informe).
  const ultimaComDimensoes = await prisma.veiculo.findFirst({
    where: { placa: placaVeiculo, OR: [{ comprimento: { not: null } }, { altura: { not: null } }] },
    orderBy: { createdAt: 'desc' },
    select: { comprimento: true, altura: true },
  });
  const dimensoes = { comprimento: ultimaComDimensoes?.comprimento ?? null, altura: ultimaComDimensoes?.altura ?? null };
  if (cadastro) {
    return res.json({
      ...dimensoes,
      modeloCarretaId: cadastro.id,
      nomeDescricao: cadastro.nomeDescricao,
      capacidadeMaximaFardos: cadastro.capacidadeMaximaFardos,
      pesoMaximoKg: cadastro.pesoMaximoKg,
      comprimentoM: cadastro.comprimentoM,
      motoristaNome: cadastro.motoristaNome,
      motoristaTelefone: cadastro.motoristaTelefone,
    });
  }

  const veiculo = await prisma.veiculo.findFirst({
    where: { placa: placaVeiculo },
    orderBy: { createdAt: 'desc' },
    include: { modeloCarreta: true },
  });

  if (!veiculo) return res.json(null); // Retorna null se não encontrar, sem erro 404 para não poluir o console

  return res.json({
    ...dimensoes,
    modeloCarretaId: veiculo.modeloCarretaId,
    nomeDescricao: veiculo.modeloCarreta.nomeDescricao,
    capacidadeMaximaFardos: veiculo.modeloCarreta.capacidadeMaximaFardos,
    pesoMaximoKg: veiculo.modeloCarreta.pesoMaximoKg,
    comprimentoM: veiculo.modeloCarreta.comprimentoM,
    motoristaNome: veiculo.motoristaNome,
    motoristaTelefone: veiculo.motoristaTelefone,
    motoristaCpf: veiculo.motoristaCpf,
  });
}

export async function buscarMotoristaPorCpf(req: AuthRequest, res: Response) {
  const cpf = req.params.cpf.replace(/\D/g, '');
  if (!cpf) return res.json(null);

  // Comparação normalizada dos dois lados: cadastros antigos/importados podem
  // ter o CPF salvo com pontuação (ex: 123.456.789-00), e a busca por dígitos
  // puros (o que o frontend sempre envia) não batia com esses registros.
  const [veiculo] = await prisma.$queryRaw<
    Array<{ motoristaNome: string; motoristaTelefone: string; motoristaCpf: string }>
  >`
    SELECT motorista_nome AS "motoristaNome", motorista_telefone AS "motoristaTelefone", motorista_cpf AS "motoristaCpf"
    FROM veiculos
    WHERE regexp_replace(motorista_cpf, '\\D', '', 'g') = ${cpf}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return res.json(veiculo ?? null);
}

export async function criar(req: AuthRequest, res: Response) {
  const data = normalizarIsca(criarSchema.parse(req.body));

  const liberacao = await prisma.liberacao.findUnique({ where: { id: data.liberacaoId } });
  if (!liberacao) throw new AppError('Liberação não encontrada', 404);

  await verificarMotorista(data, decisaoMotoristaSchema.parse(req.body.motoristaDecisao));
  const { cadastro, placaVeiculo } = await vincularCadastroBase(data, req.user?.perfil === 'ADMIN');
  const { nomeDescricao, capacidadeMaximaFardos, pesoMaximoKg, comprimentoM, ...dadosOperacionais } = data;
  const veiculo = await prisma.veiculo.create({
    data: {
      ...dadosOperacionais,
      placa: placaVeiculo,
      modeloCarretaId: cadastro.id,
      cadastradoPor: await nomeUsuario(req),
      motoristaCpf: data.motoristaCpf ?? null,
      finalizadoEm: data.status === StatusVeiculo.FINALIZADO ? new Date() : null,
      dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : null,
      dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : null,
      dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : null,
    },
    include: { modeloCarreta: true },
  });

  await reavaliarStatusLiberacao(data.liberacaoId);

  return res.status(201).json(veiculo);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = normalizarIsca(criarSchema.partial().parse(req.body));
  if (req.body.formaPagamento === null) throw new AppError('Informe a forma de pagamento', 400, 'FORMA_PAGAMENTO_OBRIGATORIA');
  const atual = await prisma.veiculo.findUnique({ where: { id: parseInt(id) } });
  if (!atual) throw new AppError('Veículo não encontrado', 404);
  if (!atual.ativo) throw new AppError('Veículo inativo não pode ser alterado. Peça a um administrador para reativá-lo.', 400, 'VEICULO_INATIVO');
  const dadosCompletos = { ...atual, ...data, placa: data.placa ?? atual.placa } as DadosVeiculo;
  const motoristaMudou =
    normalizar(dadosCompletos.motoristaNome) !== normalizar(atual.motoristaNome)
    || somenteDigitos(dadosCompletos.motoristaTelefone) !== somenteDigitos(atual.motoristaTelefone)
    || somenteDigitos(dadosCompletos.motoristaCpf) !== somenteDigitos(atual.motoristaCpf);
  if (motoristaMudou) {
    await verificarMotorista(dadosCompletos, decisaoMotoristaSchema.parse(req.body.motoristaDecisao), atual.id);
  }
  const { cadastro, placaVeiculo } = await vincularCadastroBase({
    ...dadosCompletos,
    modeloCarretaId: data.modeloCarretaId ?? atual.modeloCarretaId,
  }, req.user?.perfil === 'ADMIN');
  await propagarCadastroBase(cadastro);
  const { nomeDescricao, capacidadeMaximaFardos, pesoMaximoKg, comprimentoM, ...dadosOperacionais } = data;

  const veiculo = await prisma.veiculo.update({
    where: { id: parseInt(id) },
    data: {
      ...dadosOperacionais,
      placa: placaVeiculo,
      modeloCarretaId: cadastro.id,
      // Data em que virou FINALIZADO (relatórios); limpa se sair desse status.
      finalizadoEm: data.status === undefined || data.status === atual.status
        ? undefined
        : data.status === StatusVeiculo.FINALIZADO ? new Date() : null,
      // null limpa a data; ausente mantém a atual.
      dataAgendamento: data.dataAgendamento ? new Date(data.dataAgendamento) : data.dataAgendamento === null ? null : undefined,
      dataCarregamento: data.dataCarregamento ? new Date(data.dataCarregamento) : data.dataCarregamento === null ? null : undefined,
      dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : data.dataDescarga === null ? null : undefined,
    },
    include: { modeloCarreta: true },
  });

  await reavaliarStatusLiberacao(veiculo.liberacaoId);

  return res.json(veiculo);
}

// "Excluir" não apaga: inativa o veículo com motivo. Ele continua na lista,
// bloqueado e fora de programado/carregado/saldo/frete/relatórios.
export async function deletar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { motivo } = motivoSchema.parse(req.body ?? {});

  const veiculo = await prisma.veiculo.findUnique({ where: { id } });
  if (!veiculo) throw new AppError('Veículo não encontrado', 404);
  if (!veiculo.ativo) throw new AppError('Veículo já está inativo', 400, 'VEICULO_INATIVO');

  const atualizado = await prisma.veiculo.update({
    where: { id },
    data: { ativo: false, motivoInativacao: motivo, inativadoPor: await nomeUsuario(req), inativadoEm: new Date(), motivoReativacao: null },
  });
  await reavaliarStatusLiberacao(veiculo.liberacaoId);

  return res.json(atualizado);
}

// Reativar: só ADMIN (ver rota), com motivo. Inativação e reativação ficam no histórico.
export async function reativar(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { motivo } = motivoSchema.parse(req.body ?? {});

  const veiculo = await prisma.veiculo.findUnique({ where: { id } });
  if (!veiculo) throw new AppError('Veículo não encontrado', 404);
  if (veiculo.ativo) throw new AppError('Veículo já está ativo', 400);

  const atualizado = await prisma.veiculo.update({
    where: { id },
    data: { ativo: true, motivoReativacao: motivo, motivoInativacao: null, inativadoPor: null, inativadoEm: null },
  });
  await reavaliarStatusLiberacao(veiculo.liberacaoId);

  return res.json(atualizado);
}
