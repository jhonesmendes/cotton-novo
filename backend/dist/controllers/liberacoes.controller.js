"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.referencias = referencias;
exports.criarReferencia = criarReferencia;
exports.atualizarReferencia = atualizarReferencia;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
exports.atualizarStatus = atualizarStatus;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const client_1 = require("@prisma/client");
const criarSchema = zod_1.z.object({
    instrucao: zod_1.z.string().min(3),
    dataLiberacao: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    dataColeta: zod_1.z.string(),
    clienteId: zod_1.z.number().int().positive().optional(),
    origemId: zod_1.z.number().int().positive().optional(),
    destinoId: zod_1.z.number().int().positive().optional(),
    terminalId: zod_1.z.number().int().positive().optional(),
    localColetaId: zod_1.z.number().int().positive().optional(),
    clienteNome: zod_1.z.string().min(2).optional(),
    filialNome: zod_1.z.string().min(2).optional(),
    destinoNome: zod_1.z.string().min(2).optional(),
    origemNome: zod_1.z.string().min(2).optional(),
    localColetaNome: zod_1.z.string().min(2).optional(),
    freteEmpresa: zod_1.z.number().positive(),
    totalFardos: zod_1.z.number().int().positive(),
    tipoFardo: zod_1.z.nativeEnum(client_1.TipoFardo).default(client_1.TipoFardo.FARDAO),
    deadline: zod_1.z.string(),
    observacao: zod_1.z.string().optional(),
});
async function resolverCadastros(data) {
    const buscarOuCriar = async (tipo, id, nome) => {
        if (id)
            return id;
        const valor = nome?.trim();
        if (!valor)
            return undefined;
        if (tipo === 'cliente') {
            const item = await prisma_1.default.cliente.findFirst({ where: { nome: valor } });
            return item?.id ?? (await prisma_1.default.cliente.create({ data: { nome: valor, cnpj: `PENDENTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } })).id;
        }
        if (tipo === 'origem') {
            const item = await prisma_1.default.origem.findFirst({ where: { nome: valor } });
            return item?.id ?? (await prisma_1.default.origem.create({ data: { nome: valor, localizacao: 'Pendente', estado: '--' } })).id;
        }
        if (tipo === 'destino') {
            const item = await prisma_1.default.destino.findFirst({ where: { nome: valor } });
            return item?.id ?? (await prisma_1.default.destino.create({ data: { nome: valor, estado: '--' } })).id;
        }
        if (tipo === 'terminal') {
            const item = await prisma_1.default.terminal.findUnique({ where: { nome: valor } });
            return item?.id ?? (await prisma_1.default.terminal.create({ data: { nome: valor, tipoAcesso: 'EMAIL' } })).id;
        }
        const item = await prisma_1.default.localColeta.findFirst({ where: { nome: valor } });
        return item?.id ?? (await prisma_1.default.localColeta.create({ data: { nome: valor } })).id;
    };
    return {
        clienteId: await buscarOuCriar('cliente', data.clienteId, data.clienteNome),
        origemId: await buscarOuCriar('origem', data.origemId, data.filialNome),
        destinoId: await buscarOuCriar('destino', data.destinoId, data.destinoNome),
        terminalId: await buscarOuCriar('terminal', data.terminalId, data.origemNome),
        localColetaId: await buscarOuCriar('localColeta', data.localColetaId, data.localColetaNome),
    };
}
async function listar(req, res) {
    const { clienteId, origemId, terminalId, status, diasMaximos, page = '1', limit = '50', busca, diasMinimos, } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (clienteId)
        where.clienteId = parseInt(clienteId);
    if (origemId)
        where.origemId = parseInt(origemId);
    if (terminalId)
        where.terminalId = parseInt(terminalId);
    if (status)
        where.status = status;
    // Tratamento de datas para deadline
    const deadlineFilter = {};
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
            { instrucao: { contains: busca } },
            { veiculos: { some: { placa: { contains: busca } } } },
            { veiculos: { some: { motoristaNome: { contains: busca } } } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.liberacao.count({ where }),
        prisma_1.default.liberacao.findMany({
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
        const diasParaDeadline = Math.ceil((deadlineDate.getTime() - hoje.getTime()) / 86400000);
        return { ...l, carregado, saldo, diasParaDeadline };
    });
    return res.json({ data, total, page: parseInt(page), limit: take });
}
async function referencias(_req, res) {
    const [liberacoes, cadastradas, veiculos] = await Promise.all([prisma_1.default.liberacao.findMany({
            select: { clienteNome: true, filialNome: true, destinoNome: true, origemNome: true, localColetaNome: true },
        }), prisma_1.default.referenciaCadastro.findMany({ select: { tipo: true, valor: true } }), prisma_1.default.veiculo.findMany({ include: { modeloCarreta: { select: { nomeDescricao: true } } } })]);
    const valores = (campo, tipo) => [...new Set([...liberacoes.map((item) => item[campo]?.trim()), ...cadastradas.filter((item) => item.tipo === tipo).map((item) => item.valor)].filter(Boolean))].sort();
    return res.json({
        clientes: valores('clienteNome', 'clientes'), filiais: valores('filialNome', 'filiais'), destinos: valores('destinoNome', 'destinos'), origens: valores('origemNome', 'origens'), locaisColeta: valores('localColetaNome', 'locaisColeta'),
        modelosCarreta: [...new Set(veiculos.map((item) => item.modeloCarreta?.nomeDescricao).filter(Boolean))].sort(),
        motoristas: [...new Set(veiculos.map((item) => item.motoristaCpf ? `${item.motoristaNome} · CPF ${item.motoristaCpf}` : item.motoristaNome).filter(Boolean))].sort(),
    });
}
async function criarReferencia(req, res) {
    const data = zod_1.z.object({ tipo: zod_1.z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta']), valor: zod_1.z.string().min(2) }).parse(req.body);
    const referencia = await prisma_1.default.referenciaCadastro.upsert({ where: { tipo_valor: { tipo: data.tipo, valor: data.valor.trim() } }, update: {}, create: { tipo: data.tipo, valor: data.valor.trim() } });
    return res.status(201).json(referencia);
}
async function atualizarReferencia(req, res) {
    const body = zod_1.z.object({ tipo: zod_1.z.enum(['clientes', 'filiais', 'destinos', 'origens', 'locaisColeta', 'modelosCarreta', 'motoristas']), atual: zod_1.z.string().min(1), novo: zod_1.z.string().min(2) }).parse(req.body);
    if (body.tipo === 'modelosCarreta') {
        const resultado = await prisma_1.default.modeloCarreta.updateMany({ where: { nomeDescricao: body.atual }, data: { nomeDescricao: body.novo.trim() } });
        return res.json({ atualizados: resultado.count });
    }
    if (body.tipo === 'motoristas') {
        const cpf = body.atual.match(/CPF\s+(\d+)/)?.[1];
        if (!cpf)
            throw new errorHandler_1.AppError('CPF do motorista não encontrado', 400);
        const resultado = await prisma_1.default.veiculo.updateMany({ where: { motoristaCpf: cpf }, data: { motoristaNome: body.novo.trim() } });
        return res.json({ atualizados: resultado.count });
    }
    const campos = { clientes: 'clienteNome', filiais: 'filialNome', destinos: 'destinoNome', origens: 'origemNome', locaisColeta: 'localColetaNome' };
    const campo = campos[body.tipo];
    const novoValor = body.novo.trim();
    const resultado = await prisma_1.default.$transaction(async (tx) => {
        const liberacoes = await tx.liberacao.updateMany({ where: { [campo]: body.atual }, data: { [campo]: novoValor } });
        const referenciaAtual = await tx.referenciaCadastro.findUnique({ where: { tipo_valor: { tipo: body.tipo, valor: body.atual } } });
        if (!referenciaAtual)
            return { liberacoes: liberacoes.count, referencias: 0 };
        const referenciaComNovoValor = await tx.referenciaCadastro.findUnique({ where: { tipo_valor: { tipo: body.tipo, valor: novoValor } } });
        if (referenciaComNovoValor) {
            await tx.referenciaCadastro.delete({ where: { id: referenciaAtual.id } });
        }
        else {
            await tx.referenciaCadastro.update({ where: { id: referenciaAtual.id }, data: { valor: novoValor } });
        }
        return { liberacoes: liberacoes.count, referencias: 1 };
    });
    if (resultado.liberacoes + resultado.referencias === 0) {
        throw new errorHandler_1.AppError('Referência não encontrada para atualização', 404);
    }
    return res.json({ atualizados: resultado.liberacoes + resultado.referencias });
}
async function buscarPorId(req, res) {
    const { id } = req.params;
    const liberacao = await prisma_1.default.liberacao.findUnique({
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
    if (!liberacao)
        throw new errorHandler_1.AppError('Liberação não encontrada', 404, 'NOT_FOUND');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(liberacao.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diasParaDeadline = Math.ceil((deadlineDate.getTime() - hoje.getTime()) / 86400000);
    const carregado = liberacao.veiculos.reduce((s, v) => s + v.qtdFardos, 0);
    return res.json({
        ...liberacao,
        carregado,
        saldo: liberacao.totalFardos - carregado,
        diasParaDeadline
    });
}
async function criar(req, res) {
    const recebido = criarSchema.parse(req.body);
    const cadastros = await resolverCadastros(recebido);
    if (Object.values(cadastros).some((valor) => !valor)) {
        throw new errorHandler_1.AppError('Preencha Cliente, Filial, Destino, Origem e Local de Coleta', 400);
    }
    const data = { ...recebido, ...cadastros };
    // Validar se instrução já existe
    const existe = await prisma_1.default.liberacao.findUnique({ where: { instrucao: data.instrucao } });
    if (existe)
        throw new errorHandler_1.AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');
    // Validar se cliente existe
    const cliente = await prisma_1.default.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente)
        throw new errorHandler_1.AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');
    // Validar se origem existe
    const origem = await prisma_1.default.origem.findUnique({ where: { id: data.origemId } });
    if (!origem)
        throw new errorHandler_1.AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');
    // Validar se destino existe
    const destino = await prisma_1.default.destino.findUnique({ where: { id: data.destinoId } });
    if (!destino)
        throw new errorHandler_1.AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');
    // Validar se terminal existe
    const terminal = await prisma_1.default.terminal.findUnique({ where: { id: data.terminalId } });
    if (!terminal)
        throw new errorHandler_1.AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');
    // Validar se localColeta existe
    const localColeta = await prisma_1.default.localColeta.findUnique({ where: { id: data.localColetaId } });
    if (!localColeta)
        throw new errorHandler_1.AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');
    const { clienteNome, filialNome, destinoNome, origemNome, localColetaNome, ...dadosLiberacao } = data;
    const liberacao = await prisma_1.default.liberacao.create({
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
async function atualizar(req, res) {
    const { id } = req.params;
    const recebido = criarSchema.partial().parse(req.body);
    const cadastros = await resolverCadastros(recebido);
    const data = { ...recebido, ...cadastros };
    // Validar se liberação existe
    const liberacao = await prisma_1.default.liberacao.findUnique({ where: { id: parseInt(id) } });
    if (!liberacao)
        throw new errorHandler_1.AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
    // Validar se é uma instrução duplicada (se mudou a instrução)
    if (data.instrucao && data.instrucao !== liberacao.instrucao) {
        const existe = await prisma_1.default.liberacao.findUnique({ where: { instrucao: data.instrucao } });
        if (existe)
            throw new errorHandler_1.AppError(`Instrução "${data.instrucao}" já existe`, 409, 'DUPLICATE_INSTRUCAO');
    }
    // Validar referências caso estejam sendo alteradas
    if (data.clienteId) {
        const cliente = await prisma_1.default.cliente.findUnique({ where: { id: data.clienteId } });
        if (!cliente)
            throw new errorHandler_1.AppError(`Cliente com ID ${data.clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');
    }
    if (data.origemId) {
        const origem = await prisma_1.default.origem.findUnique({ where: { id: data.origemId } });
        if (!origem)
            throw new errorHandler_1.AppError(`Origem com ID ${data.origemId} não encontrada`, 404, 'ORIGIN_NOT_FOUND');
    }
    if (data.destinoId) {
        const destino = await prisma_1.default.destino.findUnique({ where: { id: data.destinoId } });
        if (!destino)
            throw new errorHandler_1.AppError(`Destino com ID ${data.destinoId} não encontrado`, 404, 'DESTINO_NOT_FOUND');
    }
    if (data.terminalId) {
        const terminal = await prisma_1.default.terminal.findUnique({ where: { id: data.terminalId } });
        if (!terminal)
            throw new errorHandler_1.AppError(`Terminal com ID ${data.terminalId} não encontrado`, 404, 'TERMINAL_NOT_FOUND');
    }
    if (data.localColetaId) {
        const localColeta = await prisma_1.default.localColeta.findUnique({ where: { id: data.localColetaId } });
        if (!localColeta)
            throw new errorHandler_1.AppError(`Local de Coleta com ID ${data.localColetaId} não encontrado`, 404, 'LOCAL_COLETA_NOT_FOUND');
    }
    const liberacaoAtualizada = await prisma_1.default.liberacao.update({
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
    return res.json(liberacaoAtualizada);
}
async function deletar(req, res) {
    const { id } = req.params;
    const liberacao = await prisma_1.default.liberacao.findUnique({ where: { id: parseInt(id) } });
    if (!liberacao)
        throw new errorHandler_1.AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
    await prisma_1.default.liberacao.update({
        where: { id: parseInt(id) },
        data: { status: client_1.StatusLiberacao.CANCELADA },
    });
    return res.json({ message: 'Liberação cancelada com sucesso' });
}
async function atualizarStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    // Validar status
    if (!Object.values(client_1.StatusLiberacao).includes(status)) {
        throw new errorHandler_1.AppError(`Status inválido: ${status}`, 400, 'INVALID_STATUS');
    }
    const liberacao = await prisma_1.default.liberacao.findUnique({ where: { id: parseInt(id) } });
    if (!liberacao)
        throw new errorHandler_1.AppError('Liberação não encontrada', 404, 'LIBERACAO_NOT_FOUND');
    const atualizada = await prisma_1.default.liberacao.update({
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
//# sourceMappingURL=liberacoes.controller.js.map