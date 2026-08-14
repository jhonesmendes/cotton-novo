# 🎯 GUIA RÁPIDO - Cotton Fibra Forte

## 30 Segundos para Entender o Projeto

```
🌾 Cotton Fibra Forte
  └─ Sistema de Gestão de Cargas de Algodão
     ├─ Dashboard com KPIs e gráficos
     ├─ Gestão de liberações (CRUD)
     ├─ Rastreamento de veículos
     ├─ Configuração de alertas
     ├─ Gerenciamento de terminais
     └─ Controle de usuários
```

---

## 3 Passos para Rodar (15 Minutos)

### Terminal 1: Backend
```bash
cd c:\xampp\htdocs\cotton\backend
npm install && npm run generate && npm run migrate && npm run dev
```
**Esperado:** `🚀 Cotton Backend rodando em http://localhost:3001`

### Terminal 2: Frontend
```bash
cd c:\xampp\htdocs\cotton\frontend
npm install && npm run dev
```
**Esperado:** `Local: http://localhost:5173/`

### Browser: Teste
```
http://localhost:5173
```

---

## 📁 Onde Encontrar o Quê

| Preciso... | Arquivo | Tempo |
|-----------|---------|-------|
| Começar | COMECE_AQUI.md | 5 min |
| Setup detalhado | SETUP_GUIA.md | 20 min |
| Próximas features | FRONTEND_ROADMAP.md | 30 min |
| Referência rápida | PROXIMOS_PASSOS.md | 15 min |
| Índice completo | INDEX_MESTRE.md | 10 min |

---

## ✨ O Que Há de Novo

### 🎨 DashboardCharts.tsx
- 4 gráficos profissionais
- PieChart: Distribuição de status
- BarChart: Top clientes
- LineChart: Volume/tempo
- Recharts integrado

### ⚙️ AlertasConfigPage.tsx
- CRUD de alertas
- Múltiplos canais (email, WhatsApp, SMS)
- Horários customizados
- Gerenciamento de destinatários

---

## 🗂️ Arquitetura em 30 Segundos

```
Frontend (React 18 + Vite)
    ↓ (Axios + JWT)
API REST (Express + TypeScript)
    ↓ (Prisma ORM)
Database (SQLite/PostgreSQL)
```

---

## 🔐 Autenticação

```bash
# Login
POST /api/auth/login
{
  "email": "seu@email.com",
  "password": "senha"
}

# Response
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { ... }
}
```

---

## 📊 Componentes Disponíveis

### Backend ✅
- 8 rotas principais
- 7 controllers
- JWT auth
- Prisma ORM
- 13 tabelas

### Frontend ✅
- 7 páginas principais
- 2 novos componentes (Charts + Alerts)
- React Query
- TailwindCSS
- Zustand store

---

## 🎓 Stack Tecnológico

| Layer | Tech |
|-------|------|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS |
| **Backend** | Node.js, Express, TypeScript, Prisma |
| **Database** | SQLite (dev), PostgreSQL (prod) |
| **Auth** | JWT, Refresh Tokens |
| **Charts** | Recharts |
| **State** | Zustand, React Query |
| **HTTP** | Axios |
| **UI** | React Router, React Hot Toast |

---

## ✅ Checklist de Sucesso

- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Login funcionando
- [ ] Dashboard com gráficos
- [ ] Pode navegar para outras páginas
- [ ] Pode fazer CRUD em liberações
- [ ] Pode acessar alertas

---

## 🚨 Troubleshooting Rápido

**Backend não inicia?**
```bash
npm install -D ts-node-dev@latest
npm run dev
```

**Port em uso?**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Frontend não conecta?**
- Certifique-se que backend está rodando
- Abra DevTools (F12) → Console para ver erros

---

## 📖 Documentação

| Leia | Quando | Por quê |
|------|--------|---------|
| COMECE_AQUI.md | Agora | Setup rápido |
| SETUP_GUIA.md | Se tiver erro | Troubleshooting |
| PROXIMOS_PASSOS.md | Após setup | Próximas ações |
| FRONTEND_ROADMAP.md | Esta semana | Planejar features |

---

## 🎯 Próximas 24 Horas

1. **Agora (15 min):** Execute 3 passos de setup
2. **Próximas 2 horas:** Explore o projeto
3. **Hoje:** Leia PROXIMOS_PASSOS.md
4. **Amanhã:** Escolha primeira feature e comece

---

## 💬 Dúvidas Frequentes

**Q: Posso rodar em Windows?**  
R: Sim! Este guia é para Windows.

**Q: Preciso de PostgreSQL?**  
R: Não! SQLite está pronto para dev.

**Q: Qual é a senha do admin?**  
R: Depende da sua seed data. Veja em backend/prisma/seed.ts

**Q: Quanto tempo leva para setup?**  
R: 15-30 minutos dependendo da internet.

**Q: Posso fazer contribuições?**  
R: Sim! Siga FRONTEND_ROADMAP.md

---

## 🚀 Ready?

```
┌─────────────────────────────────────┐
│  Você está pronto!                  │
│                                     │
│  Próxima ação:                      │
│  Abra: COMECE_AQUI.md              │
│  Execute: 3 passos                 │
│  Defrute: Cotton Fibra Forte! 🌾   │
└─────────────────────────────────────┘
```

---

**Criado em:** 2026-05-07  
**Versão:** 1.0.0-MVP  
**Status:** ✅ Pronto para uso
