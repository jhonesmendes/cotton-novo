import { PrismaClient } from '@prisma/client';

// Singleton para evitar múltiplas conexões (importante em produção com PM2)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
    errorFormat: 'minimal',
  });

// Reutilizar instância em desenvolvimento (evita reconexão a cada hot-reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Desconexão elegante para PM2 / SIGTERM
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
