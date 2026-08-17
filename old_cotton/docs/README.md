# 🌾 Cotton Fibra Forte - Sistema de Gestão de Cargas

> ⚠️ **NOVO:** Após análise completa, veja [COMECE_AQUI.md](./COMECE_AQUI.md) para começar o desenvolvimento ou [INDEX_MESTRE.md](./INDEX_MESTRE.md) para ver todos os recursos criados.

Sistema completo de gestão e acompanhamento de cargas de pluma de algodão com controle preciso de deadlines, alertas automáticos e rastreamento em tempo real.

## 📋 Visão Geral

Este sistema foi desenvolvido para a Cotton Fibra Forte com o objetivo de:
- ✅ Controlar deadlines críticos de entrega
- ✅ Rastrear instruções de carregamento em tempo real
- ✅ Gerenciar terminais e agendamentos
- ✅ Monitorar saldos e volumes carregados
- ✅ Integrar documentos fiscais (CT-e)
- ✅ Disparar alertas automáticos de deadlines

## 🏗️ Arquitetura do Projeto

```
cotton/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── database/
│   ├── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                # React 18 + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
│
├── docs/                    # Documentação
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SETUP.md
│   └── FEATURES.md
│
└── README.md
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn
- Git

### Instalação Rápida

#### 1. Clone e Configuração Inicial

```bash
cd cotton
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

O backend rodará em `http://localhost:3000`

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

O frontend rodará em `http://localhost:5173`

## 📊 Funcionalidades Principais - Fase 1 MVP

### ✅ Módulo 1: Dashboard Principal
- Resumo executivo com KPIs
- Tabela dinâmica de veículos próximos a vencer
- Filtros avançados (cliente, filial, terminal, motorista)
- Gráficos de distribuição e volume

### ✅ Módulo 2: Cadastro de Liberações
- Formulário com abas (Básico, Detalhes, Veículos, Documentação)
- CRUD completo de liberações
- Cálculo automático de saldo e dias para deadline
- Validação de capacidade

### ✅ Módulo 3: Acompanhamento de Cargas
- Detalhes completos por instrução
- Tabela expandida de veículos
- Dados completos do motorista (nome, telefone, CPF)
- Timeline visual de status

### ✅ Módulo 4: Alertas de Deadline (NOVO)
- Dashboard de alertas críticos
- Coluna de placa do veículo
- Coluna de dias para vencer
- Ações rápidas (WhatsApp, ligar, editar)

### ✅ Módulo 5: Modelos de Carretas
- CRUD de modelos com capacidades
- Associação a veículos
- Padronização de tipos

### ✅ Módulo 6: Gestão de Terminais
- CRUD de terminais
- Armazenamento seguro de credenciais
- Histórico de agendamentos

## 🗄️ Estrutura de Dados Principais

### Tabelas Principais
- `liberacoes` - Instruções de carregamento
- `veiculos` - Veículos vinculados às cargas
- `modelo_carretas` - Tipos de carretas
- `motoristas` - Dados de motoristas
- `terminais` - Gerenciamento de terminais
- `usuarios` - Gestão de usuários
- `alertas_log` - Histórico de alertas
- `auditoria_log` - Logs de auditoria

Para detalhes completos, veja `docs/DATABASE.md`

## 🔐 Segurança

- JWT com refresh tokens
- RBAC (Role-Based Access Control)
- Criptografia de dados sensíveis (CPF, senhas)
- HTTPS obrigatório em produção
- Logs de auditoria completos
- Conformidade LGPD

## 📱 Responsividade

- Mobile-first design
- Funciona em desktop, tablet e mobile
- PWA com funcionalidades offline básicas
- Performance otimizada (< 2s carregamento)

## 📈 Fases de Desenvolvimento

### Fase 1: MVP (3 semanas)
- [x] Estrutura base backend/frontend
- [ ] CRUD de liberações
- [ ] CRUD de veículos
- [ ] Dashboard com filtros
- [ ] Módulo de alertas
- [ ] Autenticação

### Fase 2: Acompanhamento (3 semanas)
- [ ] Dashboard com gráficos avançados
- [ ] Calendário de agendamento
- [ ] Alertas automáticos (email/WhatsApp)
- [ ] Extração de CT-e
- [ ] Relatórios

### Fase 3: Automação (2 semanas)
- [ ] Background jobs para alertas
- [ ] Integração WhatsApp Business API
- [ ] OCR para PDF
- [ ] Templates de email

### Fase 4: Otimização (1-2 semanas)
- [ ] Cache com Redis
- [ ] Backup automático
- [ ] Documentação
- [ ] Treinamento

## 📚 Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Banco de Dados](./docs/DATABASE.md)
- [API REST](./docs/API.md)
- [Setup Completo](./docs/SETUP.md)
- [Features Detalhadas](./docs/FEATURES.md)

## 🤝 Stack Tecnológico

### Backend
- **Node.js 18+**
- **Express.js** - Framework HTTP
- **TypeScript** - Type safety
- **PostgreSQL 14+** - Banco de dados
- **Prisma** - ORM
- **JWT** - Autenticação
- **Bull** - Background jobs

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool (rápido)
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **React Query** - Data fetching
- **React Table** - Advanced tables
- **Recharts** - Gráficos
- **Zustand** - State management

### Banco de Dados
- **PostgreSQL 14+**
- **Prisma ORM**
- **Redis** (cache)

## 🛠️ Comandos Úteis

### Backend
```bash
cd backend
npm install          # Instalar dependências
npm run dev         # Rodar em desenvolvimento
npm run build       # Build para produção
npm run migrate     # Rodar migrations
npm test            # Rodar testes
```

### Frontend
```bash
cd frontend
npm install          # Instalar dependências
npm run dev         # Rodar em desenvolvimento
npm run build       # Build para produção
npm run lint        # Verificar linting
npm test            # Rodar testes
```

## 📧 Variáveis de Ambiente

Veja `.env.example` em backend/ e frontend/ para todas as variáveis necessárias.

**Backend (.env)**:
```
DATABASE_URL=postgresql://user:password@localhost:5432/cotton
JWT_SECRET=your-secret-key
PORT=3000
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:3000
```

## 📞 Suporte e Contato

Para dúvidas sobre o sistema, consulte a documentação em `/docs` ou entre em contato com o time de desenvolvimento.

---

**Last Updated**: 2026-05-04
**Version**: 1.0.0 (MVP)
