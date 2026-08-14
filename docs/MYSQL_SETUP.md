# 🗄️ GUIA COMPLETO - MIGRAÇÃO PARA MySQL

## 📋 Resumo do que foi feito

✅ Schema.prisma configurado para MySQL  
✅ Arquivo .env atualizado com DATABASE_URL para MySQL  
✅ Script SQL de criação do banco pronto  

---

## 🚀 PASSO 1: Preparar o MySQL (XAMPP)

### Verificar se MySQL está rodando no XAMPP:
```bash
# Ir para o painel de controle do XAMPP
# Garantir que MySQL está iniciado (botão "Start" em MySQL)
```

### Abrir phpMyAdmin:
```
http://localhost/phpmyadmin
```

---

## 🔧 PASSO 2: Criar o banco de dados

### Opção A: Via phpMyAdmin (Mais fácil)

1. Abra http://localhost/phpmyadmin
2. Clique em "SQL" no topo
3. Copie todo o conteúdo de `backend/setup-mysql.sql`
4. Cole no editor SQL
5. Clique em "Executar"

### Opção B: Via Terminal/PowerShell

```powershell
# Abra PowerShell e execute:
mysql -u root -p < c:\xampp\htdocs\cotton\backend\setup-mysql.sql

# Se solicitada senha, deixe em branco (pressione Enter)
```

---

## 📦 PASSO 3: Instalar dependências do Prisma

```bash
# No terminal, dentro da pasta backend
cd c:\xampp\htdocs\cotton\backend

# Instalar/atualizar Prisma
npm install

# Gerar cliente Prisma para MySQL
npm run generate
```

---

## 🔄 PASSO 4: Aplicar migrações (se houver)

```bash
# Dentro de backend/
npm run migrate
```

---

## ✅ PASSO 5: Testar conexão

```bash
# Dentro de backend/
npm run dev

# Você deve ver:
# ✅ Prisma conectado com sucesso ao MySQL
# ✅ Servidor rodando em http://localhost:3001
```

---

## 📝 Estrutura do banco de dados

### Tabelas criadas:

```
clientes          → Clientes/Empresas
origens           → Filiais/Localizações
usuarios          → Usuários do sistema
terminais         → Terminais de destino
modelo_carretas   → Modelos de carretas
transportadoras   → Empresas de transporte
liberacoes        → Ordens de carregamento
veiculos          → Veículos/Carretas
alertas_config    → Configuração de alertas
alertas           → Histórico de alertas
auditoria_logs    → Log de auditoria
```

---

## 👤 Usuário Admin Padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@cottonfibra.com.br` |
| Senha | `admin123` |
| Perfil | ADMIN |

**Altere a senha na primeira vez que fizer login!**

---

## 🔑 Configurações MySQL (.env)

```env
DATABASE_URL="mysql://root:@localhost:3306/cotton_db"
```

### Componentes:
- `root` = usuário MySQL (XAMPP padrão)
- (sem senha) = XAMPP não tem senha por padrão
- `localhost` = seu computador
- `3306` = porta padrão MySQL
- `cotton_db` = nome do banco de dados

---

## 🚨 Troubleshooting

### Erro: "Can't connect to MySQL server"
```
❌ Solução: MySQL não está rodando
✅ Inicie MySQL no painel XAMPP
```

### Erro: "Access denied for user 'root'@'localhost'"
```
❌ Problema: Senha incorreta ou usuário errado
✅ Verifique credenciais no .env
✅ Tente: mysql://root:@localhost:3306/cotton_db (sem senha)
```

### Erro: "Database cotton_db doesn't exist"
```
❌ Problema: Script SQL não foi executado
✅ Execute novamente o setup-mysql.sql via phpMyAdmin
```

### Erro: "Prisma - Unsupported database provider"
```
❌ Problema: schema.prisma ainda tem "sqlite"
✅ Verifique que schema.prisma tem:
   provider = "mysql"
   url      = env("DATABASE_URL")
```

---

## 🔄 Fluxo de Desenvolvimento

```
DESENVOLVIMENTO (Local)
├── MySQL rodando no XAMPP
├── .env com DATABASE_URL local
└── npm run dev → Servidor em :3001

        ↓ (depois testado)

PRODUÇÃO (Servidor)
├── Alterar DATABASE_URL em .env
├── Apontar para MySQL do servidor
└── npm run migrate:prod → Aplicar mudanças
```

---

## 📊 Backup do Banco

### Fazer backup:
```bash
# PowerShell
mysqldump -u root cotton_db > backup_cotton.sql
```

### Restaurar backup:
```bash
# PowerShell
mysql -u root cotton_db < backup_cotton.sql
```

---

## 🎯 Próximos Passos

1. ✅ Execute o setup-mysql.sql
2. ✅ Configure .env com DATABASE_URL
3. ✅ Execute `npm run generate` e `npm run migrate`
4. ✅ Inicie o servidor com `npm run dev`
5. ✅ Faça login com admin@cottonfibra.com.br / admin123

---

## 📚 Referências

- [Prisma MySQL Docs](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [XAMPP MySQL](https://www.apachefriends.org/pt_br/index.html)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

**Pronto! Seu backend está configurado com MySQL! 🎉**
