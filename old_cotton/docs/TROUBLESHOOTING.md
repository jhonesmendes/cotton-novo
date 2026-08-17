# 🔧 TROUBLESHOOTING - Aplicação Não Está Abrindo

## 🚨 Diagnóstico Automático

Se a aplicação não está abrindo, siga este guia para encontrar e resolver o problema.

---

## ✅ Pré-Requisitos

Antes de começar, verifique:

```bash
# Verificar Node.js
node --version
# Esperado: v18.x ou superior

# Verificar npm
npm --version
# Esperado: 8.x ou superior
```

Se não estiver instalado, baixe de: https://nodejs.org/

---

## 🔍 Problema 1: Backend Não Inicia

### Sintoma
```
npm run dev não funciona
OU
Erro: command not found: ts-node-dev
```

### Solução Rápida
```bash
cd c:\xampp\htdocs\cotton\backend

# Limpe e reinstale
rm -r node_modules
npm install

# Se ainda não funcionar
npm install -D ts-node-dev@latest

# Tente novamente
npm run dev
```

### Esperado
```
🚀 Cotton Backend rodando em http://localhost:3001
```

---

## 🔍 Problema 2: Backend Diz "Port 3001 Already In Use"

### Sintoma
```
Error: listen EADDRINUSE: address already in use :::3001
```

### Solução
```bash
# Encontre o processo usando a porta 3001
netstat -ano | findstr :3001

# Você verá algo como:
# TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345

# Mate o processo (substitua 12345 pelo PID)
taskkill /PID 12345 /F

# Tente novamente
npm run dev
```

---

## 🔍 Problema 3: Frontend Não Inicia

### Sintoma
```
npm run dev não funciona
OU
Erro: command not found: vite
```

### Solução Rápida
```bash
cd c:\xampp\htdocs\cotton\frontend

# Limpe e reinstale
rm -r node_modules
npm install

# Tente novamente
npm run dev
```

### Esperado
```
VITE v5.0.11  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
```

---

## 🔍 Problema 4: Frontend Inicia Mas Não Conecta ao Backend

### Sintoma
```
Tela branca no browser
OU
Erro: Failed to fetch (no console)
OU
Error: Cannot GET http://localhost:3001/health
```

### Solução
```bash
# Certifique-se que BACKEND está rodando
# Em outro terminal:
curl http://localhost:3001/health

# Se não funcionar, inicie backend
npm run dev  # Na pasta backend

# Aguarde 5-10 segundos
# Depois recarregue frontend (F5)
```

---

## 🔍 Problema 5: Banco de Dados Não Criado

### Sintoma
```
Error: SQLITE_CANTOPEN
OU
database does not exist
OU
PRISMA_DATABASE_URL error
```

### Solução
```bash
cd c:\xampp\htdocs\cotton\backend

# Gere o cliente Prisma
npm run generate

# Crie o banco e execute migrations
npm run migrate

# Se pedir confirmação, responda: y

# Se tiver erro de migrations, tente:
npm run migrate:reset
```

---

## 🔍 Problema 6: Tela Branca / Em Branco

### Sintoma
```
Browser carrega mas fica em branco
```

### Solução

**Passo 1:** Abra DevTools (F12)

**Passo 2:** Vá para "Console" e veja os erros

**Passo 3:** Se vir erro de API:
```bash
# Terminal 1 - Certifique-se que backend roda
cd backend && npm run dev

# Aguarde aparecer: 🚀 Cotton Backend rodando
```

**Passo 4:** Recarregue frontend (F5)

**Passo 5:** Se ainda branco:
```bash
# Terminal 2 - Reinicie frontend
cd frontend
npm run dev
```

---

## 🔍 Problema 7: Login Não Funciona

### Sintoma
```
Erro ao fazer login
OU
Email ou senha inválidos
```

### Solução

**Opção 1:** Criar usuário admin
```bash
cd backend
node create-admin.js
```

Credenciais:
- Email: admin@cotton.com
- Senha: admin123

**Opção 2:** Verificar dados no banco
```bash
# Verifique se há usuários no SQLite
# Arquivo: backend/dev.db
```

---

## 🔍 Problema 8: Erros "Module Not Found"

### Sintoma
```
Error: Cannot find module '@/...'
OU
Error: Module not found
```

### Solução
```bash
# Frontend
cd c:\xampp\htdocs\cotton\frontend
npm install

# Backend
cd c:\xampp\htdocs\cotton\backend
npm install
```

Se ainda não funcionar:
```bash
# Limpe cache
rm -r node_modules package-lock.json
npm install
```

---

## ✅ Checklist de Inicialização

- [ ] **Node.js instalado** (node --version)
- [ ] **npm atualizado** (npm --version)
- [ ] **Terminal no diretório correto**
  - Backend: `c:\xampp\htdocs\cotton\backend`
  - Frontend: `c:\xampp\htdocs\cotton\frontend`
- [ ] **npm install executado** em ambas pastas
- [ ] **Migrations rodadas** (npm run migrate)
- [ ] **Backend rodando** em terminal 1
- [ ] **Frontend rodando** em terminal 2
- [ ] **http://localhost:5173 acessível** no browser
- [ ] **Login funciona**
- [ ] **Dashboard aparece com gráficos**

---

## 🚀 Instruções Passo-a-Passo Completas

### Terminal 1 - Backend (Execute PRIMEIRO)
```bash
cd c:\xampp\htdocs\cotton\backend
npm install
npm run generate
npm run migrate
npm run dev
```

**Aguarde aparecer:**
```
🚀 Cotton Backend rodando em http://localhost:3001
```

### Terminal 2 - Frontend (Execute DEPOIS)
```bash
cd c:\xampp\htdocs\cotton\frontend
npm install
npm run dev
```

**Aguarde aparecer:**
```
VITE v5.0.11 ready in XXXms
Local: http://localhost:5173/
```

### Browser
```
Abra: http://localhost:5173
```

---

## 🆘 Nenhuma Das Soluções Funcionou?

### Coleta de Informações

Por favor, execute e compartilhe o resultado:

**1. Versão do Node**
```bash
node --version
npm --version
```

**2. Erro exato do backend**
```bash
cd c:\xampp\htdocs\cotton\backend
npm run dev
# Copie o erro completo
```

**3. Erro exato do frontend**
```bash
cd c:\xampp\htdocs\cotton\frontend
npm run dev
# Copie o erro completo
```

**4. Verifique DevTools (F12 no browser)**
```
Console → Console tab
Copie qualquer erro vermelho
```

---

## 💡 Dicas Importantes

### Sempre execute NESTA ORDEM
1. Backend primeiro
2. Aguarde 5 segundos
3. Frontend depois
4. Aguarde 10 segundos
5. Abra no browser

### Use Terminais Separados
- Terminal 1: Backend
- Terminal 2: Frontend
- (Não feche nenhum!)

### Se der erro "port already in use"
```bash
# Mate todos os node processes
taskkill /IM node.exe /F

# Espere 5 segundos
timeout /t 5

# Tente novamente
```

### Se der erro de migrations
```bash
# Reset completo do banco
cd backend
npm run migrate:reset
npm run dev
```

---

## 📞 Status dos Serviços

Para verificar se tudo está rodando corretamente:

```bash
# Terminal 3 - Verificar backend
curl http://localhost:3001/health

# Esperado:
# {"status":"ok","timestamp":"2026-05-07T..."}
```

---

## ✅ Você Conseguiu!

Se chegou até aqui e tudo funcionou:

- ✅ Backend rodando em :3001
- ✅ Frontend rodando em :5173
- ✅ Browser abrindo dashboard
- ✅ Pode fazer login
- ✅ Vê gráficos e tabelas

**Parabéns! 🎉**

---

**Próxima ação:** Abra `PROXIMOS_PASSOS.md` para saber o que fazer depois.

**Data:** 2026-05-07  
**Status:** Troubleshooting Completo
