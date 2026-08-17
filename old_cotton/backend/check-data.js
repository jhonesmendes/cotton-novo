const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const clientes = await prisma.cliente.findMany({ select: { id: true, nome: true }, take: 5 });
  const origens = await prisma.origem.findMany({ select: { id: true, nome: true }, take: 5 });
  const terminais = await prisma.terminal.findMany({ select: { id: true, nome: true }, take: 5 });
  console.log('CLIENTES:', JSON.stringify(clientes));
  console.log('ORIGENS:', JSON.stringify(origens));
  console.log('TERMINAIS:', JSON.stringify(terminais));
  await prisma.$disconnect();
}
check().catch(e => { console.error(e.message); process.exit(1); });
