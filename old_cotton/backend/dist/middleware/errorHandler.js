"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class AppError extends Error {
    constructor(message, statusCode = 400, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code || 'ERROR',
                message: err.message,
            },
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Dados inválidos',
                details: err.errors,
            },
        });
    }
    // Erros do Prisma
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err;
        if (prismaErr.code === 'P2002') {
            return res.status(409).json({
                error: {
                    code: 'DUPLICATE_ENTRY',
                    message: 'Registro já existe com esses dados',
                    field: prismaErr.meta?.target,
                },
            });
        }
        if (prismaErr.code === 'P2025') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Registro não encontrado' },
            });
        }
    }
    console.error('Erro não tratado:', err);
    return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
}
//# sourceMappingURL=errorHandler.js.map