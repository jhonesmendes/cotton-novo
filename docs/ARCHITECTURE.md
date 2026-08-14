# 🏗️ Arquitetura do Sistema

## Visão Geral

O sistema Cotton Fibra Forte segue uma arquitetura **Client-Server** moderna com separação clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                     │
│  Dashboard │ Cadastros │ Acompanhamento │ Alertas │ Relatórios  │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTP/REST + WebSocket (future)
                         │
┌────────────────────────┴──────────────────────────────────────┐
│               Backend (Express + TypeScript)                   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  Controllers  (Request Handling)                         │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │  Services     (Business Logic)                           │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │  Middleware   (Auth, Validation, Error Handling)        │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │  Models/ORM   (Data Layer - Prisma)                     │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    PostgreSQL       Redis Cache    File Storage
   (Primary DB)    (Session/Data)   (CT-e, NF-e)
```

## 1. Camada de Apresentação (Frontend)

### Estrutura de Pastas
```
frontend/src/
├── components/           # Componentes reutilizáveis
│   ├── common/          # Botões, inputs, modais
│   ├── dashboard/       # Componentes do dashboard
│   ├── forms/           # Formulários
│   └── tables/          # Tabelas
├── pages/               # Páginas/Rotas
│   ├── Dashboard.tsx
│   ├── Liberacoes/
│   ├── Veiculos/
│   ├── Alertas/
│   └── ...
├── services/            # Chamadas HTTP
│   ├── api.ts
│   ├── liberacoes.ts
│   ├── veiculos.ts
│   └── ...
├── hooks/               # Custom hooks
│   ├── useAuth.ts
│   ├── useLiberacoes.ts
│   └── ...
├── context/             # Contexto (Auth, User)
│   ├── AuthContext.tsx
│   └── ...
└── styles/              # CSS/Tailwind globals
```

### Tecnologias
- **React 18**: UI framework com hooks
- **Vite**: Fast build tool e dev server
- **TypeScript**: Type safety
- **TailwindCSS**: Utility-first CSS
- **React Query**: Data fetching e caching
- **Zustand**: State management
- **React Table v8**: Tabelas avançadas com filtros
- **Recharts**: Gráficos
- **React Router**: Navegação

## 2. Camada de API (Backend)

### Arquitetura em Camadas

#### Controllers
Responsáveis por:
- Receber requisições HTTP
- Validar entrada
- Chamar serviços
- Retornar respostas

```
GET  /api/liberacoes
POST /api/liberacoes
GET  /api/liberacoes/:id
PUT  /api/liberacoes/:id
DELETE /api/liberacoes/:id
```

#### Services
Contêm a lógica de negócio:
- Cálculos (saldo, dias para deadline)
- Validações de regras
- Orquestração de dados
- Alertas

#### Middleware
- Autenticação (JWT)
- Autorização (RBAC)
- Validação de schema
- Error handling
- Logging

#### Models/ORM
- Prisma para acesso a dados
- Migrations automáticas
- Type safety no banco

### Rotas Principais - Fase 1

```
API v1 Routes:
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   └── POST /refresh
├── /liberacoes
│   ├── GET /         (com filtros)
│   ├── POST /        (criar nova)
│   ├── GET /:id      (detalhes)
│   ├── PUT /:id      (atualizar)
│   └── DELETE /:id   (deletar)
├── /veiculos
│   ├── GET /         (listar por liberacao)
│   ├── POST /        (criar novo)
│   ├── PUT /:id      (atualizar)
│   └── DELETE /:id   (deletar)
├── /modelos
│   ├── GET /         (listar modelos)
│   ├── POST /        (criar novo)
│   ├── PUT /:id      (atualizar)
│   └── DELETE /:id   (deletar)
├── /terminais
│   ├── GET /
│   ├── POST /
│   ├── PUT /:id
│   └── DELETE /:id
├── /alertas
│   ├── GET /         (listar alertas)
│   ├── GET /config   (configurações)
│   ├── PUT /config   (atualizar config)
│   └── GET /history  (histórico)
└── /usuarios
    ├── GET /
    ├── POST /
    ├── PUT /:id
    └── DELETE /:id
```

## 3. Camada de Dados

### Banco de Dados (PostgreSQL)

**Características**:
- Índices em colunas frequentemente consultadas (instrucao, placa, deadline)
- Foreign keys com constraints
- Enums para campos categorizados
- Soft delete (status ativo/inativo)
- Audit trail completo

**Principais Tabelas**:
1. `liberacoes` - Instruções de carregamento
2. `veiculos` - Veículos associados
3. `modelo_carretas` - Tipos de carretas
4. `motoristas` - Dados de motoristas
5. `usuarios` - Usuários do sistema
6. `terminais` - Gerenciamento de terminais
7. `alertas_config` - Configurações de alertas
8. `alertas_log` - Histórico de alertas
9. `auditoria_log` - Log de mudanças

### Cache (Redis)

Usado para:
- Sessões de autenticação (JWT stored)
- Dados de terminais (atualizado a cada 1h)
- Modelos de carretas
- Configurações globais
- Rate limiting

### File Storage

Armazenar arquivos em:
- AWS S3 ou
- Google Cloud Storage ou
- Local (desenvolvimento)

Arquivos:
- CT-e (XML/PDF)
- NF-e
- Comprovantes
- Documentos diversos

## 4. Fluxo de Dados - Exemplo: Criar Liberação

```
Frontend
   │
   ├─> User preenche formulário
   │   (Validação cliente-side)
   │
   ├─> POST /api/liberacoes
   │   { instrucao, cliente_id, total_fardos, deadline, ... }
   │
Backend (Express)
   │
   ├─> Middleware Auth
   │   (Verifica JWT, extrai usuario_id)
   │
   ├─> Controller: criarLiberacao()
   │   ├─> Valida schema (Joi/Zod)
   │   ├─> Chama service
   │   └─> Retorna resultado
   │
   ├─> Service: criarLiberacao()
   │   ├─> Valida regras de negócio
   │   ├─> Calcula dias para deadline
   │   ├─> Cria registro no BD
   │   ├─> Registra auditoria
   │   ├─> Invalida cache se necessário
   │   └─> Retorna objeto criado
   │
   ├─> Prisma ORM
   │   ├─> INSERT INTO liberacoes
   │   ├─> INSERT INTO auditoria_log
   │   └─> Retorna resultado
   │
   └─> PostgreSQL
       (Persiste dados)

Response:
   ├─> Status 201
   ├─> Body: { id, instrucao, cliente_id, ..., created_at }
   └─> Frontend atualiza lista
```

## 5. Autenticação e Autorização

### JWT Flow

```
1. Login
   POST /auth/login { email, password }
   → Response: { accessToken, refreshToken, user }

2. Requisições Autenticadas
   GET /api/liberacoes
   Header: Authorization: Bearer <accessToken>

3. Refresh Token
   POST /auth/refresh { refreshToken }
   → Response: { accessToken }
```

### RBAC (Role-Based Access Control)

Perfis:
- **ADMIN**: Acesso total, gestão de usuários
- **OPERADOR**: CRUD de cargas, acompanhamento
- **GESTOR_FILIAL**: Visão de sua filial
- **VISUALIZADOR**: Apenas leitura
- **CLIENTE**: Visão restrita

Middleware de autorização:
```typescript
requireRole(ADMIN)
requireRole(ADMIN, OPERADOR)
```

## 6. Tratamento de Erros

### Estratégia de Erros

Todos os erros retornam com status HTTP apropriado:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validação falhou",
    "details": [
      { "field": "total_fardos", "message": "Deve ser > 0" }
    ]
  }
}
```

Tipos de erro:
- 400 Bad Request - Validação
- 401 Unauthorized - Sem autenticação
- 403 Forbidden - Sem autorização
- 404 Not Found - Recurso inexistente
- 409 Conflict - Violação de constraint
- 500 Internal Server Error

## 7. Logging e Monitoramento

### Logs
- Requests/Responses (em dev)
- Erros com stack trace
- Auditoria de mudanças
- Alertas disparados

### Auditoria
Toda alteração registra:
- Usuário que alterou
- Tabela afetada
- Dados antigos
- Dados novos
- Timestamp

## 8. Performance e Escalabilidade

### Otimizações
- Índices de banco de dados
- Pagination nas listagens
- Cache com Redis
- Lazy loading no frontend
- Code splitting (Vite)
- Compressão de resposta (gzip)

### Limites
- Pagination: 50 registros/página por padrão
- Timeout: 30s para requisições
- File size: 10MB máximo
- Rate limiting: 100 req/min por IP

## 9. Testing Strategy

### Backend
- Unit tests (services)
- Integration tests (API)
- Database tests
- Coverage > 80%

### Frontend
- Component tests (React Testing Library)
- Integration tests (user flows)
- E2E tests (Cypress/Playwright)

## 10. CI/CD Pipeline (Future)

```
GitHub Push
   │
   ├─> GitHub Actions
   │   ├─> Lint/Format
   │   ├─> Tests
   │   ├─> Build
   │   └─> Deploy
   │
   └─> Production
```

---

**Referência Rápida de Camadas**:
- Frontend: React, componentes reutilizáveis, state management
- API: Express, controllers, services, middleware
- Database: PostgreSQL, Prisma ORM, migrations
- Cache: Redis para sessões e dados frequentes
- Storage: AWS S3 ou local para arquivos
