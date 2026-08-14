# 🚀 Guia Completo de Setup - Cotton Fibra Forte

## ✅ Pré-Requisitos Verificados
- ✅ Node.js 18+ (você deve ter)
- ✅ Estrutura do projeto completa
- ✅ TypeScript configurado
- ✅ Prisma com SQLite pronto
- ✅ Express.js estruturado

---

## 📋 FASE 1: Setup Backend

### Passo 1.1 - Instalar Dependências Backend

```bash
cd c:\xampp\htdocs\cotton\backend
npm install
```

**O que será instalado:**
- `ts-node-dev` - Para desenvolvimento com hot reload
- `@prisma/client` - ORM do banco de dados
- `express` - Framework HTTP
- `jsonwebtoken` - Autenticação JWT
- `bcryptjs` - Hash de senhas
- `cors` - Política CORS
- `zod` - Validação de esquemas

### Passo 1.2 - Verificar/Atualizar Prisma

```bash
cd c:\xampp\htdocs\cotton\backend
npm run generate
```

Isto gera o cliente Prisma necessário.

### Passo 1.3 - Executar Migrations

```bash
npm run migrate
```

Isto criará as tabelas no SQLite (arquivo: `backend/dev.db`).

### Passo 1.4 - Verificar Database

```bash
node check-tables.js
```

Verificará se todas as tabelas foram criadas corretamente.

### Passo 1.5 - Iniciar Backend em Desenvolvimento

```bash
npm run dev
```

**Você deve ver:**
```
🚀 Cotton Backend rodando em http://localhost:3001
```

**Teste o health check:**
```bash
curl http://localhost:3001/health
```

Esperado: `{"status":"ok","timestamp":"2026-05-07T..."}`

---

## 📋 FASE 2: Setup Frontend

### Passo 2.1 - Instalar Dependências Frontend

```bash
cd c:\xampp\htdocs\cotton\frontend
npm install
```

**O que será instalado:**
- React 18 - UI Framework
- Vite - Build tool
- TailwindCSS - Estilização
- React Router - Navegação
- React Query - Gerenciamento de dados
- Axios - Cliente HTTP
- Zustand - State management

### Passo 2.2 - Iniciar Frontend em Desenvolvimento

```bash
npm run dev
```

**Você deve ver:**
```
  VITE v5.0.11  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

---

## 🧪 FASE 3: Validação de API

### Teste 1 - Health Check
```bash
curl http://localhost:3001/health
```

### Teste 2 - Criar Usuário Admin (Opcional)

Se não tiver dados de seed ainda:

```bash
cd backend
node create-admin.js
```

Credenciais padrão:
- **Email:** admin@cotton.com
- **Senha:** admin123

### Teste 3 - Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cotton.com",
    "password": "admin123"
  }'
```

Esperado: Retorna `accessToken` e `refreshToken`

### Teste 4 - Dashboard

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dashboard/resumo
```

---

## 🗂️ Estrutura Pronta

```
cotton/
├── backend/
│   ├── src/
│   │   ├── app.ts                 ✅ Express app
│   │   ├── middleware/            ✅ Auth, ErrorHandler
│   │   ├── routes/                ✅ 8 rotas principais
│   │   ├── controllers/           ✅ Lógica de negócio
│   │   ├── database/              ✅ Prisma config
│   │   └── types/                 ✅ TypeScript types
│   ├── prisma/
│   │   └── schema.prisma          ✅ 13 tabelas
│   ├── dev.db                     📄 SQLite criado
│   ├── package.json               ✅ Scripts prontos
│   └── tsconfig.json              ✅ Configurado
│
├── frontend/
│   ├── src/
│   │   ├── components/            📁 Vazios (A preencher)
│   │   ├── pages/                 📁 Vazios (A preencher)
│   │   ├── services/              ✅ API client
│   │   ├── hooks/                 📁 Vazios (A preencher)
│   │   └── context/               📁 Vazios (A preencher)
│   ├── package.json               ✅ Dependências OK
│   └── vite.config.ts             ✅ Configurado
│
└── docs/
    ├── ARCHITECTURE.md            📋 Referência
    ├── DATABASE.md                📋 Schema completo
    ├── API.md                     📋 Endpoints
    └── SETUP.md                   📋 Detalhes
```

---

## 🎯 Próximas Etapas (Após Setup)

### Curto Prazo (Esta semana)
1. ✅ Setup completo backend/frontend
2. ✅ Testar autenticação
3. ✅ CRUD de Liberações funcionando
4. ✅ Dashboard básico no frontend
5. ✅ Integração com API

### Médio Prazo (Próxima semana)
1. Alertas de deadline
2. Timeline de status
3. Filtros avançados
4. Relatórios
5. Melhorias de UX

### Longo Prazo (Semanas seguintes)
1. Integração WhatsApp
2. OCR para CT-e
3. Redis cache
4. Documentação de produção
5. Deploy

---

## ⚠️ Troubleshooting

### "ts-node-dev not found"
```bash
npm install -D ts-node-dev@latest
npm run dev
```

### "DATABASE_URL missing"
O projeto usa SQLite, não precisa de DATABASE_URL! Está em `prisma/schema.prisma`

### "Port 3001 já em uso"
```bash
# Windows - Encontrar e matar processo na porta 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### "Vite connection failed"
Certifique-se de que o backend está rodando:
```bash
npm run dev  # Executar no backend PRIMEIRO
```

---

## 📞 Documentação Complementar

- Veja `docs/ARCHITECTURE.md` para entender o design
- Veja `docs/DATABASE.md` para esquema completo
- Veja `docs/API.md` para endpoints detalhados
- Veja `docs/SETUP.md` para configurações avançadas

---

**Status:** 🟢 Pronto para Setup  
**Última atualização:** 2026-05-07  
**Versão:** 1.0.0-MVP
