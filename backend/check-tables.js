const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dev.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Erro:', err);
  } else {
    console.log('Tabelas no banco:');
    rows.forEach(row => {
      console.log('-', row.name);
    });
  }
  db.close();
});