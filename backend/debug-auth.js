const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debug() {
  const user = await prisma.usuario.findUnique({ where: { email: 'admin@cottonfibraforte.com' } });
  console.log('User:', JSON.stringify({ id: user?.id, email: user?.email, ativo: user?.ativo, hashLen: user?.senhaHash?.length }));
  
  const valid = await bcrypt.compare('admin123', user?.senhaHash || '');
  console.log('bcrypt.compare result:', valid);
  
  // Simulate the controller logic
  if (!user || !user.ativo) {
    console.log('FAIL: user not found or inactive');
    return;
  }
  if (!valid) {
    console.log('FAIL: password invalid');
    return;
  }
  console.log('SUCCESS: Would return token');
  
  await prisma.$disconnect();
}

debug().catch(e => { console.error(e.message); process.exit(1); });
