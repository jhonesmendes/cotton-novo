const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./dev.db');

async function setupDatabase() {
  console.log('Configurando banco de dados...');

  // Criar tabela usuarios
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT DEFAULT 'USER',
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createTableSQL, async function(err) {
    if (err) {
      console.error('Erro ao criar tabela:', err);
      db.close();
      return;
    }

    console.log('✅ Tabela usuarios criada');

    // Criar usuário admin
    const senhaHash = await bcrypt.hash('admin123', 12);

    const insertUserSQL = `
      INSERT OR REPLACE INTO usuarios (nome, email, senha_hash, perfil)
      VALUES (?, ?, ?, ?)
    `;

    db.run(insertUserSQL, ['Administrador', 'admin@cottonfibraforte.com', senhaHash, 'ADMIN'], function(err) {
      if (err) {
        console.error('Erro ao criar usuário:', err);
      } else {
        console.log('✅ Usuário admin criado com sucesso!');
        console.log('   Email: admin@cottonfibraforte.com');
        console.log('   Senha: admin123');
      }
      db.close();
    });
  });
}

setupDatabase();