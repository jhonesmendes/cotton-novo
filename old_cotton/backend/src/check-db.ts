
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany();
  console.log('Clientes:', JSON.stringify(clientes, null, 2));
  const origens = await prisma.origem.findMany();
  console.log('Origens:', JSON.stringify(origens, null, 2));
  const terminais = await prisma.terminal.findMany();
  console.log('Terminais:', JSON.stringify(terminais, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
