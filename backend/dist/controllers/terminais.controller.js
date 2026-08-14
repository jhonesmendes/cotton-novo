"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.listarSimples = listarSimples;
exports.buscarPorId = buscarPorId;
exports.criar = criar;
exports.atualizar = atualizar;
exports.deletar = deletar;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../database/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const prisma_types_1 = require("../types/prisma-types");
const schema = zod_1.z.object({
    nome: zod_1.z.string().min(2),
    tipoAcesso: zod_1.z.nativeEnum(prisma_types_1.TipoAcesso).optional().default(prisma_types_1.TipoAcesso.LINK),
    linkSistema: zod_1.z.string().url().optional().nullable(),
    login: zod_1.z.string().optional().nullable(),
    senha: zod_1.z.string().optional().nullable(),
    cnpj: zod_1.z.string().optional().nullable(),
    emailsContato: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional().nullable(),
    instrucoesEspecificas: zod_1.z.string().optional().nullable(),
    documentosNecessarios: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional().nullable(),
});
async function listar(req, res) {
    const { page = '1', limit = '100', busca } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (busca) {
        where.OR = [
            { nome: { contains: busca } },
            { cnpj: { contains: busca } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.default.terminal.count({ where }),
        prisma_1.default.terminal.findMany({
            where,
            orderBy: { nome: 'asc' },
            skip,
            take,
            select: {
                id: true,
                nome: true,
                tipoAcesso: true,
                linkSistema: true,
                login: true,
                emailsContato: true,
                documentosNecessarios: true,
                instrucoesEspecificas: true,
                cnpj: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
    ]);
    return res.json({ data: items, total, page: parseInt(page), limit: take });
}
async function listarSimples(_req, res) {
    const terminais = await prisma_1.default.terminal.findMany({
        orderBy: { nome: 'asc' },
        select: {
            id: true,
            nome: true,
        },
    });
    return res.json(terminais);
}
async function buscarPorId(req, res) {
    const terminal = await prisma_1.default.terminal.findUnique({
        where: { id: parseInt(req.params.id) },
    });
    if (!terminal)
        throw new errorHandler_1.AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');
    return res.json(terminal);
}
async function criar(req, res) {
    const data = schema.parse(req.body);
    // Validar se terminal com mesmo nome já existe
    const existe = await prisma_1.default.terminal.findUnique({ where: { nome: data.nome } });
    if (existe)
        throw new errorHandler_1.AppError(`Terminal "${data.nome}" já cadastrado`, 409, 'DUPLICATE_TERMINAL_NAME');
    const terminal = await prisma_1.default.terminal.create({
        data: {
            ...data,
            emailsContato: Array.isArray(data.emailsContato) ? data.emailsContato.join(',') : (data.emailsContato ?? null),
            documentosNecessarios: Array.isArray(data.documentosNecessarios) ? data.documentosNecessarios.join(',') : (data.documentosNecessarios ?? null),
        },
        select: {
            id: true,
            nome: true,
            tipoAcesso: true,
            linkSistema: true,
            login: true,
            cnpj: true,
            emailsContato: true,
            instrucoesEspecificas: true,
            documentosNecessarios: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return res.status(201).json(terminal);
}
async function atualizar(req, res) {
    const id = parseInt(req.params.id);
    const data = schema.partial().parse(req.body);
    // Validar se terminal existe
    const terminal = await prisma_1.default.terminal.findUnique({ where: { id } });
    if (!terminal)
        throw new errorHandler_1.AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');
    // Validar se novo nome já existe (se estiver sendo alterado)
    if (data.nome && data.nome !== terminal.nome) {
        const existe = await prisma_1.default.terminal.findUnique({ where: { nome: data.nome } });
        if (existe)
            throw new errorHandler_1.AppError(`Terminal "${data.nome}" já cadastrado`, 409, 'DUPLICATE_TERMINAL_NAME');
    }
    const terminalAtualizado = await prisma_1.default.terminal.update({
        where: { id },
        data: {
            ...data,
            emailsContato: Array.isArray(data.emailsContato) ? data.emailsContato.join(',') : data.emailsContato,
            documentosNecessarios: Array.isArray(data.documentosNecessarios) ? data.documentosNecessarios.join(',') : data.documentosNecessarios,
        },
        select: {
            id: true,
            nome: true,
            tipoAcesso: true,
            linkSistema: true,
            login: true,
            cnpj: true,
            emailsContato: true,
            instrucoesEspecificas: true,
            documentosNecessarios: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    return res.json(terminalAtualizado);
}
async function deletar(req, res) {
    const id = parseInt(req.params.id);
    // Validar se terminal existe
    const terminal = await prisma_1.default.terminal.findUnique({ where: { id } });
    if (!terminal)
        throw new errorHandler_1.AppError('Terminal não encontrado', 404, 'TERMINAL_NOT_FOUND');
    // Validar se terminal não está em uso (tem liberações)
    const emUso = await prisma_1.default.liberacao.count({ where: { terminalId: id } });
    if (emUso > 0) {
        throw new errorHandler_1.AppError(`Terminal não pode ser deletado pois possui ${emUso} liberação(ões)`, 409, 'TERMINAL_IN_USE');
    }
    await prisma_1.default.terminal.delete({ where: { id } });
    return res.json({ message: 'Terminal removido com sucesso' });
}
//# sourceMappingURL=terminais.controller.js.map