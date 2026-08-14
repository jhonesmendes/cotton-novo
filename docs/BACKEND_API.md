# 📡 Documentação Backend - Cotton

## Visão Geral
API Express/TypeScript com Prisma + SQLite para gerenciamento de Liberações e Terminais.

---

## 🔐 Endpoints de Liberações

### Base URL: `/api/liberacoes`

#### 1. **Listar Liberações**
```http
GET /api/liberacoes
```

**Query Parameters:**
- `page` (number): Página (default: 1)
- `limit` (number): Itens por página (default: 50)
- `status` (string): `ATIVA`, `CONCLUIDA`, `CANCELADA`
- `busca` (string): Busca por instrução, placa ou motorista
- `clienteId` (number): Filtrar por cliente
- `origemId` (number): Filtrar por origem
- `terminalId` (number): Filtrar por terminal
- `diasMinimos` (number): Deadline >= dias a partir de hoje
- `diasMaximos` (number): Deadline <= dias a partir de hoje

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "instrucao": "INSTR001",
      "dataLiberacao": "2026-05-13T10:30:00Z",
      "deadline": "2026-05-20T00:00:00Z",
      "totalFardos": 100,
      "carregado": 45,
      "saldo": 55,
      "diasParaDeadline": 7,
      "status": "ATIVA",
      "cliente": { "id": 1, "nome": "Cliente A" },
      "origem": { "id": 1, "nome": "Filial SP" },
      "terminal": { "id": 1, "nome": "Terminal João de Barro" }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```

---

#### 2. **Buscar Liberação por ID**
```http
GET /api/liberacoes/:id
```

**Response:**
```json
{
  "id": 1,
  "instrucao": "INSTR001",
  "dataLiberacao": "2026-05-13T10:30:00Z",
  "dataColeta": "2026-05-13T00:00:00Z",
  "destino": "Salvador, BA",
  "localColeta": "Prédio A",
  "freteEmpresa": 1500.00,
  "totalFardos": 100,
  "tipoFardo": "FARDAO",
  "deadline": "2026-05-20T00:00:00Z",
  "carregado": 45,
  "saldo": 55,
  "diasParaDeadline": 7,
  "status": "ATIVA",
  "observacao": "Carga prioritária",
  "cliente": { "id": 1, "nome": "Cliente A" },
  "origem": { "id": 1, "nome": "Filial SP" },
  "terminal": { "id": 1, "nome": "Terminal João de Barro" },
  "veiculos": [
    {
      "id": 1,
      "placa": "ABC1234",
      "qtdFardos": 45,
      "status": "CARREGADO",
      "motoristaNome": "João Silva",
      "motoristaTelefone": "11999999999"
    }
  ]
}
```

---

#### 3. **Criar Liberação**
```http
POST /api/liberacoes
Content-Type: application/json
```

**Body:**
```json
{
  "instrucao": "INSTR001",
  "dataLiberacao": "2026-05-13",
  "dataColeta": "2026-05-13",
  "clienteId": 1,
  "origemId": 1,
  "destino": "Salvador, BA",
  "terminalId": 1,
  "localColeta": "Prédio A",
  "freteEmpresa": 1500.00,
  "totalFardos": 100,
  "tipoFardo": "FARDAO",
  "deadline": "2026-05-20",
  "observacao": "Carga prioritária"
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "instrucao": "INSTR001",
  "status": "ATIVA",
  ...
}
```

**Erros:**
- `409 DUPLICATE_INSTRUCAO`: Instrução já existe
- `404 CLIENT_NOT_FOUND`: Cliente não existe
- `404 ORIGIN_NOT_FOUND`: Origem não existe
- `404 TERMINAL_NOT_FOUND`: Terminal não existe

---

#### 4. **Atualizar Liberação**
```http
PUT /api/liberacoes/:id
Content-Type: application/json
```

**Body:** (campos opcionais)
```json
{
  "totalFardos": 120,
  "deadline": "2026-05-25",
  "observacao": "Alterado"
}
```

**Response:** (200 OK)

---

#### 5. **Atualizar Status**
```http
PATCH /api/liberacoes/:id/status
Content-Type: application/json
```

**Body:**
```json
{
  "status": "CONCLUIDA"
}
```

**Status válidos:** `ATIVA`, `CONCLUIDA`, `CANCELADA`

**Response:** (200 OK)

---

#### 6. **Cancelar Liberação**
```http
DELETE /api/liberacoes/:id
```

**Response:**
```json
{
  "message": "Liberação cancelada com sucesso"
}
```

---

## 🏢 Endpoints de Terminais

### Base URL: `/api/terminais`

#### 1. **Listar Todos os Terminais**
```http
GET /api/terminais
```

**Response:**
```json
[
  {
    "id": 1,
    "nome": "Terminal João de Barro",
    "tipoAcesso": "LINK",
    "linkSistema": "https://terminal.agendamento.com",
    "login": "usuario@terminal.com",
    "cnpj": "12.345.678/0001-90",
    "emailsContato": "contato@terminal.com",
    "instrucoesEspecificas": "...",
    "documentosNecessarios": "...",
    "createdAt": "2026-05-01T10:00:00Z",
    "updatedAt": "2026-05-13T10:00:00Z"
  }
]
```

---

#### 2. **Listar Terminais (Simples)**
```http
GET /api/terminais/simples/lista
```

**Response (para dropdowns):**
```json
[
  { "id": 1, "nome": "Terminal João de Barro" },
  { "id": 2, "nome": "Terminal Santa Inês" }
]
```

---

#### 3. **Buscar Terminal por ID**
```http
GET /api/terminais/:id
```

**Response:** (inclui senha)
```json
{
  "id": 1,
  "nome": "Terminal João de Barro",
  "tipoAcesso": "LINK",
  "linkSistema": "https://terminal.agendamento.com",
  "login": "usuario@terminal.com",
  "senha": "***criptografada***",
  "cnpj": "12.345.678/0001-90",
  "emailsContato": "contato@terminal.com",
  "instrucoesEspecificas": "Agende com 48h antecedência",
  "documentosNecessarios": "CTE, Conhecimento de Embarque",
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-13T10:00:00Z"
}
```

---

#### 4. **Criar Terminal**
```http
POST /api/terminais
Content-Type: application/json
```

**Body:**
```json
{
  "nome": "Terminal João de Barro",
  "tipoAcesso": "LINK",
  "linkSistema": "https://terminal.agendamento.com",
  "login": "usuario@terminal.com",
  "senha": "sua_senha_aqui",
  "cnpj": "12.345.678/0001-90",
  "emailsContato": ["contato@terminal.com"],
  "instrucoesEspecificas": "Agende com 48h antecedência",
  "documentosNecessarios": ["CTE", "Conhecimento de Embarque"]
}
```

**Tipo de Acesso válidos:** `EMAIL`, `LINK`, `API`

**Response:** (201 Created)

---

#### 5. **Atualizar Terminal**
```http
PUT /api/terminais/:id
Content-Type: application/json
```

**Body:** (campos opcionais)
```json
{
  "nome": "Terminal João de Barro Atualizado",
  "linkSistema": "https://novo-link.com",
  "senha": "nova_senha"
}
```

**Response:** (200 OK)

---

#### 6. **Deletar Terminal**
```http
DELETE /api/terminais/:id
```

**Response:**
```json
{
  "message": "Terminal removido com sucesso"
}
```

**Erros:**
- `409 TERMINAL_IN_USE`: Terminal não pode ser deletado pois possui liberações ativas

---

## 📊 Fluxo de Dados

```
Cliente (Frontend)
    ↓
GET /api/liberacoes?status=ATIVA
    ↓
Backend (Controller Liberações)
    ↓
Prisma Query
    ↓
SQLite Database
    ↓
Cálculos (saldo, dias)
    ↓
Response JSON
    ↓
Frontend (React Query)
```

---

## ✅ Melhorias Implementadas

### Liberações:
- ✅ Correção de bug no cálculo de dias para deadline
- ✅ Validação de integridade referencial (cliente, origem, terminal)
- ✅ Validação de instrução duplicada
- ✅ Endpoint separado para atualizar status
- ✅ Melhor tratamento de datas

### Terminais:
- ✅ Validação de nome único
- ✅ Verificação de integridade ao deletar (não permite deletar se em uso)
- ✅ Endpoint simplificado para dropdowns
- ✅ Melhor tratamento de erros
- ✅ Códigos de erro padronizados

---

## 🔒 Autenticação

Todos os endpoints requerem autenticação via JWT (Bearer token).

**Header:**
```http
Authorization: Bearer seu_token_jwt_aqui
```

---

## 📝 Códigos de Erro

| Código | Significado | Exemplo |
|--------|------------|---------|
| `400` | Bad Request | Dados inválidos no corpo |
| `401` | Unauthorized | Token ausente ou inválido |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Recurso já existe ou em conflito |
| `500` | Server Error | Erro interno do servidor |

---

## 🧪 Exemplos de Uso com cURL

### Listar liberações ativas
```bash
curl -X GET "http://localhost:3001/api/liberacoes?status=ATIVA&limit=10" \
  -H "Authorization: Bearer seu_token"
```

### Criar terminal
```bash
curl -X POST "http://localhost:3001/api/terminais" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Terminal Novo",
    "tipoAcesso": "LINK",
    "linkSistema": "https://link.com",
    "login": "user@example.com",
    "senha": "password123"
  }'
```

---

**Última atualização:** 13 de maio de 2026
