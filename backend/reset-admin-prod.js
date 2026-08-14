const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    console.log('--- Reseting Admin User ---');
    const email = 'admin@cottonfibraforte.com';
    const password = 'admin123';
    const salt = 12;
    const hash = await bcrypt.hash(password, salt);

    const user = await prisma.usuario.upsert({
      where: { email },
      update: {
        senhaHash: hash,
        ativo: true,
        perfil: 'ADMIN'
      },
      create: {
        nome: 'Administrador',
        email,
        senhaHash: hash,
        perfil: 'ADMIN',
        ativo: true
      }
    });

    console.log('✅ Admin user created/updated successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${user.nome}`);
    console.log(`🛡️ Profile: ${user.perfil}`);
    console.log(`🟢 Status: ${user.ativo ? 'Ativo' : 'Inativo'}`);

  } catch (error) {
    console.error('❌ Error reseting admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
