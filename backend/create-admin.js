const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./dev.db');

async function createAdminUser() {
  console.log('Criando usuário admin...');

  const senhaHash = await bcrypt.hash('admin123', 12);

  const sql = `
    INSERT OR REPLACE INTO usuarios (id, nome, email, senha_hash, perfil, created_at, updated_at)
    VALUES (
      1,
      'Administrador',
      'admin@cottonfibraforte.com',
      '${senhaHash}',
      'ADMIN',
      datetime('now'),
      datetime('now')
    )
  `;

  db.run(sql, function(err) {
    if (err) {
      console.error('Erro ao criar usuário:', err);
    } else {
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   Email: admin@cottonfibraforte.com');
      console.log('   Senha: admin123');
    }
    db.close();
  });
}

createAdminUser();