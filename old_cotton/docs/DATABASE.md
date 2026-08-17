# 🗄️ Modelo de Dados - PostgreSQL

## Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIBERACOES (Cargas)                          │
│  id, instrucao*, data_liberacao, data_coleta, cliente_id,      │
│  origem_id, destino, terminal_id, local_coleta, total_fardos,  │
│  deadline, carregado, status, created_at, updated_at           │
└────────────────────────┬────────────────────────────────────────┘
                         │ 1:N
        ┌────────────────┴─────────────────┐
        │                                  │
┌───────┴──────────────────┐    ┌──────────┴────────────────┐
│  VEICULOS                │    │  AUDITORIA_LOG           │
│  id, liberacao_id*,      │    │  id, usuario_id,         │
│  placa*, tipo_veiculo_id,│    │  tabela_afetada,         │
│  qtd_fardos, motorista_* │    │  registro_id, acao,      │
│  status, data_*,         │    │  dados_antigos/novos     │
│  created_at, updated_at  │    │  created_at              │
└────────┬─────────────────┘    └──────────────────────────┘
         │
         └─> MODELO_CARRETAS
             MOTORISTAS
             TRANSPORTADORA
             TERMINAIS

┌─────────────────────────────────────────┐
│  USUARIOS (Gestão de Acesso)            │
│  id, nome, email*, senha_hash,          │
│  perfil, cliente_id, ativo, last_login  │
└────────────────┬────────────────────────┘
                 │ 1:N
                 ├─> SESSAO
                 └─> AUDITORIA_LOG

┌─────────────────────────────────────────┐
│  ALERTAS_CONFIG (Configurações)         │
│  id, cliente_id, terminal_id,           │
│  tipo_alerta, dias_antes, canais,       │
│  destinatarios, horario_inicio/fim      │
└─────────────────────────────────────────┘
         │
         └─> ALERTAS_LOG
             id, liberacao_id, veiculo_id
             tipo_alerta, canal, status
             enviado_em
```

## Tabelas Detalhadas

### 1. LIBERACOES (Instruções de Carregamento)

Armazena as instruções de carregamento/cargas.

```sql
CREATE TABLE liberacoes (
  id SERIAL PRIMARY KEY,
  instrucao VARCHAR(100) NOT NULL UNIQUE,
  data_liberacao DATE NOT NULL,
  data_coleta DATE NOT NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  origem_id INTEGER NOT NULL REFERENCES origens(id),
  destino VARCHAR(100) NOT NULL,
  terminal_id INTEGER NOT NULL REFERENCES terminais(id),
  local_coleta VARCHAR(100) NOT NULL,
  frete_empresa DECIMAL(10,2) NOT NULL,
  total_fardos INTEGER NOT NULL CHECK (total_fardos > 0),
  tipo_fardo VARCHAR(20) NOT NULL DEFAULT 'FARDÃO',
  deadline DATE NOT NULL,
  carregado INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_instrucao (instrucao),
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_deadline (deadline),
  INDEX idx_status (status)
);
```

**Campos**:
- `instrucao`: Código único (ex: S07453-MÃE-JAN-01)
- `total_fardos`: Quantidade total a carregar
- `carregado`: Soma dos fardos de todos os veículos
- `saldo`: Calculado como total_fardos - carregado
- `deadline`: Data limite para conclusão
- `status`: ATIVA, CONCLUIDA, CANCELADA

### 2. VEICULOS (Veículos/Carretas)

Veículos associados a cada instrução.

```sql
CREATE TABLE veiculos (
  id SERIAL PRIMARY KEY,
  liberacao_id INTEGER NOT NULL REFERENCES liberacoes(id) ON DELETE CASCADE,
  placa VARCHAR(20) NOT NULL UNIQUE,
  modelo_carreta_id INTEGER NOT NULL REFERENCES modelo_carretas(id),
  frete_motorista DECIMAL(10,2) NOT NULL,
  qtd_fardos INTEGER NOT NULL,
  motorista_nome VARCHAR(100) NOT NULL,
  motorista_telefone VARCHAR(20) NOT NULL,
  motorista_cpf VARCHAR(11) NOT NULL ENCRYPTED,
  motorista_email VARCHAR(100),
  transportadora_id INTEGER REFERENCES transportadoras(id),
  status VARCHAR(30) NOT NULL DEFAULT 'AGENDADO',
  data_agendamento TIMESTAMP,
  data_carregamento TIMESTAMP,
  data_descarga TIMESTAMP,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_liberacao_id (liberacao_id),
  INDEX idx_placa (placa),
  INDEX idx_status (status)
);
```

**Status Possíveis**:
- AGENDADO, CARREGADO, EM_TRANSITO, FINALIZADO, LIBERADO, etc.

**Motorista Completo**:
- Nome, telefone (clicável para WhatsApp)
- CPF (criptografado)
- Email para notificações

### 3. MODELO_CARRETAS (Tipos de Veículos)

Novo: Cadastro de modelos de carretas com capacidades.

```sql
CREATE TABLE modelo_carretas (
  id SERIAL PRIMARY KEY,
  nome_descricao VARCHAR(100) NOT NULL UNIQUE,
  capacidade_maxima_fardos INTEGER NOT NULL,
  peso_maximo_kg INTEGER NOT NULL,
  comprimento_m DECIMAL(5,2),
  largura_m DECIMAL(5,2),
  altura_m DECIMAL(5,2),
  caracteristicas_especiais TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome_descricao)
);
```

**Exemplos**:
- RODOTREM BITOLA DUPLA
- LS SIDER FECHADA
- LS GRANELEIRO ALUMÍNIO
- BITREM
- TRUCK

### 4. MOTORISTAS

Tabela separada de motoristas (para futuras otimizações).

```sql
CREATE TABLE motoristas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  cpf VARCHAR(11) NOT NULL UNIQUE ENCRYPTED,
  email VARCHAR(100),
  transportadora_id INTEGER REFERENCES transportadoras(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_telefone (telefone),
  INDEX idx_cpf (cpf)
);
```

### 5. CLIENTES

```sql
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  cnpj VARCHAR(14) NOT NULL UNIQUE ENCRYPTED,
  contatos JSON,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome)
);
```

**Exemplo contatos**:
```json
{
  "email": "contato@cliente.com",
  "telefone": "1133334444",
  "responsavel": "João Silva"
}
```

### 6. ORIGENS (Filiais)

```sql
CREATE TABLE origens (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  localizacao VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Exemplos**:
- PRIMAVERA DO LESTE-MT
- LUCAS DO RIO VERDE-MT
- SINOP-MT

### 7. TERMINAIS

Gerenciamento de terminais com credenciais.

```sql
CREATE TABLE terminais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  tipo_acesso VARCHAR(20) NOT NULL,
  link_sistema VARCHAR(255),
  login VARCHAR(100) ENCRYPTED,
  senha VARCHAR(255) ENCRYPTED,
  cnpj VARCHAR(14) ENCRYPTED,
  emails_contato JSON,
  instrucoes_especificas TEXT,
  documentos_necessarios JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome)
);
```

### 8. TRANSPORTADORAS

```sql
CREATE TABLE transportadoras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  telefone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9. USUARIOS

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  perfil VARCHAR(30) NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  filial_id INTEGER REFERENCES origens(id),
  ativo BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_perfil (perfil)
);
```

**Perfis**:
- ADMIN, OPERADOR, GESTOR_FILIAL, VISUALIZADOR, CLIENTE

### 10. ALERTAS_CONFIG

Configurações de alertas.

```sql
CREATE TABLE alertas_config (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  terminal_id INTEGER REFERENCES terminais(id),
  tipo_alerta VARCHAR(50) NOT NULL,
  dias_antes INTEGER NOT NULL,
  canais JSON,
  destinatarios JSON,
  horario_inicio TIME,
  horario_fim TIME,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Canais**:
```json
{
  "email": true,
  "whatsapp": true,
  "in_app": true
}
```

### 11. ALERTAS_LOG

Histórico de alertas disparados.

```sql
CREATE TABLE alertas_log (
  id SERIAL PRIMARY KEY,
  liberacao_id INTEGER REFERENCES liberacoes(id),
  veiculo_id INTEGER REFERENCES veiculos(id),
  tipo_alerta VARCHAR(50) NOT NULL,
  canal VARCHAR(50) NOT NULL,
  destinatario VARCHAR(255) NOT NULL,
  dias_restantes INTEGER,
  placa_veiculo VARCHAR(20),
  mensagem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_liberacao_id (liberacao_id),
  INDEX idx_enviado_em (enviado_em),
  INDEX idx_status (status)
);
```

### 12. AUDITORIA_LOG

Log completo de todas as mudanças.

```sql
CREATE TABLE auditoria_log (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tabela_afetada VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  acao VARCHAR(20) NOT NULL,
  dados_antigos JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tabela_afetada (tabela_afetada),
  INDEX idx_created_at (created_at)
);
```

## Constraints e Índices

### Constraints Principais

```sql
-- Saldo não pode ser negativo
ALTER TABLE liberacoes
ADD CHECK (carregado <= total_fardos);

-- CPF único por motorista
ALTER TABLE motoristas
ADD CONSTRAINT unique_cpf UNIQUE (cpf);

-- Um usuário por email
ALTER TABLE usuarios
ADD CONSTRAINT unique_email UNIQUE (email);

-- Placa única por veículo
ALTER TABLE veiculos
ADD CONSTRAINT unique_placa UNIQUE (placa);
```

### Índices de Performance

```sql
-- Para busca rápida de cargas
CREATE INDEX idx_deadline ON liberacoes(deadline) WHERE status = 'ATIVA';
CREATE INDEX idx_cliente_deadline ON liberacoes(cliente_id, deadline);

-- Para busca de veículos por status
CREATE INDEX idx_veiculo_status ON veiculos(status, data_carregamento);

-- Para alertas
CREATE INDEX idx_alertas_log_data ON alertas_log(enviado_em DESC);
```

## Views Úteis

### View: Cargas com Saldo Pendente

```sql
CREATE VIEW vw_cargas_pendentes AS
SELECT 
  l.id,
  l.instrucao,
  c.nome as cliente,
  l.total_fardos,
  COALESCE(SUM(v.qtd_fardos), 0) as carregado,
  l.total_fardos - COALESCE(SUM(v.qtd_fardos), 0) as saldo,
  l.deadline,
  CURRENT_DATE - l.deadline as dias_vencidos,
  l.status
FROM liberacoes l
LEFT JOIN veiculos v ON l.id = v.liberacao_id
LEFT JOIN clientes c ON l.cliente_id = c.id
WHERE l.status = 'ATIVA'
GROUP BY l.id, c.nome;
```

### View: Alertas Críticos

```sql
CREATE VIEW vw_alertas_criticos AS
SELECT 
  l.id as liberacao_id,
  l.instrucao,
  v.placa,
  c.nome as cliente,
  l.deadline,
  CURRENT_DATE - l.deadline as dias_vencidos,
  v.motorista_nome,
  v.motorista_telefone,
  l.total_fardos - COALESCE(SUM(v.qtd_fardos), 0) as saldo_pendente
FROM liberacoes l
LEFT JOIN veiculos v ON l.id = v.liberacao_id
LEFT JOIN clientes c ON l.cliente_id = c.id
WHERE l.status = 'ATIVA' 
  AND l.deadline <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY l.deadline ASC;
```

## Política de Retenção de Dados

- **Alertas Log**: Manter por 1 ano
- **Auditoria Log**: Manter indefinidamente
- **Cargas Completadas**: Manter indefinidamente
- **Soft Delete**: Marcar como inativo, não deletar

## Criptografia

Campos sensíveis criptografados com **AES-256**:
- CPF de motoristas
- Senhas de terminais
- CNPJ de clientes
- Login/Senha em terminais

---

**Última Atualização**: 2026-05-04
**Versão**: 1.0.0
