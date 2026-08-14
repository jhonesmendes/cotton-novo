const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setup() {
  // Admin
  const senhaHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@cottonfibraforte.com' },
    update: { senhaHash },
    create: {
      nome: 'Administrador',
      email: 'admin@cottonfibraforte.com',
      senhaHash,
      perfil: 'ADMIN',
    },
  });
  console.log('Admin criado:', admin.email);

  // Terminais básicos
  const terminais = [
    { nome: 'SANTOS - CODESP', tipoAcesso: 'EMAIL', login: 'santos@terminal.com', senha: 'senha123' },
    { nome: 'PARANAGUÁ - PORTONAVE', tipoAcesso: 'LINK', linkSistema: 'https://portonave.com.br', login: 'paranagua@terminal.com', senha: 'senha123' },
    { nome: 'VITÓRIA - PEIÚ', tipoAcesso: 'EMAIL', login: 'vitoria@terminal.com', senha: 'senha123' },
    { nome: 'ITAJAÍ - PORTONAVE', tipoAcesso: 'LINK', linkSistema: 'https://portonave.sc.gov.br', login: 'itajai@terminal.com', senha: 'senha123' },
  ];

  for (const t of terminais) {
    await prisma.terminal.upsert({
      where: { nome: t.nome },
      update: {},
      create: t,
    });
  }
  console.log(`${terminais.length} terminais criados`);
  
  await prisma.$disconnect();
}

setup().catch(e => { console.error(e.message); process.exit(1); });
