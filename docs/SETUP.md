# Setup e Instalação

## Pré-requisitos

- **Node.js 18+** — https://nodejs.org
- **PostgreSQL 14+** — https://www.postgresql.org/download/
- XAMPP já instalado (disponível no sistema)

---

## 1. Configurar o Banco de Dados PostgreSQL

Abra o pgAdmin ou psql e crie o banco:

```sql
CREATE DATABASE cotton_db;
CREATE USER cotton_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE cotton_db TO cotton_user;
```

---

## 2. Configurar o Backend

```bash
cd c:/xampp/htdocs/cotton/backend

# Copiar arquivo de variáveis
copy .env.example .env
```

Editar o arquivo `.env`:
```
DATABASE_URL="postgresql://cotton_user:sua_senha@localhost:5432/cotton_db"
JWT_SECRET="gere-uma-chave-forte-aqui-minimo-32-chars"
PORT=3001
```

Instalar dependências e criar banco:
```bash
npm install
npm run generate      # gerar Prisma Client
npm run migrate       # criar as tabelas
npm run seed          # popular dados iniciais
npm run dev           # iniciar em desenvolvimento
```

Backend rodará em: **http://localhost:3001**

### Credenciais iniciais (seed)
- **Email**: admin@cottonfibraforte.com
- **Senha**: admin123

---

## 3. Configurar o Frontend

```bash
cd c:/xampp/htdocs/cotton/frontend

# Copiar arquivo de variáveis
copy .env.example .env
```

Arquivo `.env` (padrão):
```
VITE_API_URL=http://localhost:3001
```

Instalar e iniciar:
```bash
npm install
npm run dev
```

Frontend rodará em: **http://localhost:5173**

---

## 4. Verificar o Sistema

Acesse http://localhost:5173 no navegador.

Login com as credenciais acima.

### Checklist de funcionalidades (Fase 1 MVP)
- [ ] Login e autenticação
- [ ] Dashboard com KPIs
- [ ] Tabela de veículos vencendo com filtros
- [ ] Listagem de liberações
- [ ] Criar/editar liberação
- [ ] Ver detalhes da liberação
- [ ] Adicionar/editar/remover veículos
- [ ] Dados completos do motorista (nome + telefone)
- [ ] Links WhatsApp ao motorista
- [ ] Módulo de Alertas de Deadline
- [ ] Cadastro de modelos de carretas

---

## 5. Estrutura de Dados Seed

O seed cria automaticamente:

**Clientes**: BRASIL AGRO, COFCO, NUTRADE, SCHEFFER, LDC, BOA ESPERANÇA

**Filiais**: Primavera do Leste, Lucas do Rio Verde, Sinop, Sapezal, Rondonópolis, Sorriso, Campo Novo

**Terminais**: DALASTRA, ALAMO, ISIS, CONLINE, MEDLOG, SIGMA, DEPOTCE, NG REDEX, BRADO, LDC

**Modelos de Carretas**: RODOTREM, LS SIDER, LS GRANELEIRO, 4º EIXO, VANDERLEIA SIDER, BITREM, BITRUCK, TRUCK

---

## 6. Scripts Disponíveis

### Backend
```bash
npm run dev          # desenvolvimento com hot-reload
npm run build        # compilar TypeScript
npm run start        # produção
npm run migrate      # rodar migrations
npm run seed         # popular banco com dados iniciais
npm run generate     # gerar Prisma Client
```

### Frontend
```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run preview      # visualizar build
npm run lint         # verificar código
```

---

## 7. Troubleshooting

### Erro de conexão com banco
Verifique se o PostgreSQL está rodando e as credenciais no `.env` estão corretas.

### Porta 3001 em uso
Altere o `PORT` no `.env` do backend e o proxy no `vite.config.ts`.

### Erro de CORS
Verifique se `FRONTEND_URL` no `.env` do backend aponta para o endereço correto do frontend.

### Prisma não encontrado
```bash
cd backend && npm run generate
```
