import { AsyncLocalStorage } from 'async_hooks';

// Quem está fazendo a requisição atual. Preenchido pelo middleware `authenticate`
// e lido pela extensão do Prisma (database/prisma.ts), que grava a auditoria de
// toda escrita sem que cada controller precise lembrar de registrar.
export interface ContextoAuditoria {
  usuarioId: number;
  ip?: string;
  rota?: string;
}

const armazenamento = new AsyncLocalStorage<ContextoAuditoria>();

export function executarComContexto<T>(contexto: ContextoAuditoria, fn: () => T): T {
  return armazenamento.run(contexto, fn);
}

export function contextoAtual(): ContextoAuditoria | undefined {
  return armazenamento.getStore();
}
