-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CRIAÇÃO - COTTON FIBRA FORTE DATABASE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Execute este script no seu MySQL para criar o banco de dados

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS cotton_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Usar o banco
USE cotton_db;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Configurações iniciais
-- ═══════════════════════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 0;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELAS DO SISTEMA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) UNIQUE NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  email VARCHAR(255),
  contatos VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cnpj (cnpj),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Origens (Filiais)
CREATE TABLE IF NOT EXISTS origens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) UNIQUE NOT NULL,
  localizacao VARCHAR(500),
  estado VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  perfil ENUM('ADMIN', 'OPERADOR', 'GESTOR_FILIAL', 'VISUALIZADOR', 'CLIENTE') NOT NULL,
  cliente_id INT,
  filial_id INT,
  ativo BOOLEAN DEFAULT true,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_perfil (perfil),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (filial_id) REFERENCES origens(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Terminais
CREATE TABLE IF NOT EXISTS terminais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) UNIQUE NOT NULL,
  tipo_acesso ENUM('EMAIL', 'LINK', 'API') NOT NULL,
  link_sistema VARCHAR(500),
  login VARCHAR(255),
  senha VARCHAR(255),
  cnpj VARCHAR(18),
  emails_contato VARCHAR(500),
  instrucoes_especificas TEXT,
  documentos_necessarios TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nome (nome),
  INDEX idx_tipo_acesso (tipo_acesso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modelos de Carreta
CREATE TABLE IF NOT EXISTS modelo_carretas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_descricao VARCHAR(255) UNIQUE NOT NULL,
  motorista_nome VARCHAR(255),
  motorista_telefone VARCHAR(20),
  capacidade_maxima_fardos INT NOT NULL,
  peso_maximo_kg INT NOT NULL,
  comprimento_m DECIMAL(8, 2),
  largura_m DECIMAL(8, 2),
  altura_m DECIMAL(8, 2),
  caracteristicas_especiais TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transportadoras
CREATE TABLE IF NOT EXISTS transportadoras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) UNIQUE NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Liberações
CREATE TABLE IF NOT EXISTS liberacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instrucao VARCHAR(100) UNIQUE NOT NULL,
  data_liberacao TIMESTAMP NOT NULL,
  data_coleta TIMESTAMP NOT NULL,
  cliente_id INT NOT NULL,
  origem_id INT NOT NULL,
  destino VARCHAR(255) NOT NULL,
  terminal_id INT NOT NULL,
  local_coleta VARCHAR(500) NOT NULL,
  frete_empresa DECIMAL(10, 2) NOT NULL,
  total_fardos INT NOT NULL,
  tipo_fardo ENUM('FARDAO', 'FARDINHO') DEFAULT 'FARDAO',
  deadline TIMESTAMP NOT NULL,
  carregado INT DEFAULT 0,
  observacao TEXT,
  status ENUM('ATIVA', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'ATIVA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (origem_id) REFERENCES origens(id),
  FOREIGN KEY (terminal_id) REFERENCES terminais(id),
  INDEX idx_instrucao (instrucao),
  INDEX idx_status (status),
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Veículos
CREATE TABLE IF NOT EXISTS veiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  modelo_id INT NOT NULL,
  transportadora_id INT NOT NULL,
  status ENUM('AGENDADO', 'CARREGADO', 'EM_TRANSITO', 'FINALIZADO', 'LIBERADO', 'AGUARDANDO_CARREGAMENTO', 'AGUARDANDO_DESCARGA', 'AGUARDANDO_NFE', 'AGUARDANDO_GR', 'FALTA_AGENDAR', 'FALTA_CONTRATAR', 'SOLICITADO', 'PIX_PAGO', 'CARTA_FRETE') NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_coleta TIMESTAMP,
  data_entrega TIMESTAMP,
  dias_vencimento INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (modelo_id) REFERENCES modelo_carretas(id),
  FOREIGN KEY (transportadora_id) REFERENCES transportadoras(id),
  INDEX idx_placa (placa),
  INDEX idx_status (status),
  INDEX idx_data_entrega (data_entrega)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alertas Config
CREATE TABLE IF NOT EXISTS alertas_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT,
  terminal_id INT,
  tipo_alerta ENUM('DEADLINE_PROXIMO', 'CARGA_ATRASADA', 'SALDO_PENDENTE', 'STATUS_ALTERADO', 'DOCUMENTACAO_PENDENTE', 'AGENDAMENTO_NECESSARIO') NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (terminal_id) REFERENCES terminais(id) ON DELETE CASCADE,
  INDEX idx_tipo_alerta (tipo_alerta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alertas (Histórico de envios)
CREATE TABLE IF NOT EXISTS alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_alerta ENUM('DEADLINE_PROXIMO', 'CARGA_ATRASADA', 'SALDO_PENDENTE', 'STATUS_ALTERADO', 'DOCUMENTACAO_PENDENTE', 'AGENDAMENTO_NECESSARIO') NOT NULL,
  status ENUM('ENVIADO', 'FALHOU', 'PENDENTE') NOT NULL,
  destinatarios VARCHAR(500) NOT NULL,
  mensagem TEXT,
  liberacao_id INT,
  data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (liberacao_id) REFERENCES liberacoes(id) ON DELETE SET NULL,
  INDEX idx_tipo (tipo_alerta),
  INDEX idx_status (status),
  INDEX idx_data_envio (data_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditoria
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  acao ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  tabela VARCHAR(100) NOT NULL,
  registro_id INT NOT NULL,
  valores_anteriores JSON,
  valores_novos JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario (usuario_id),
  INDEX idx_tabela (tabela),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Origens (Filiais)
INSERT INTO origens (nome, localizacao, estado) VALUES
('Matriz - São Paulo', 'São Paulo - SP', 'SP'),
('Filial - Minas Gerais', 'Belo Horizonte - MG', 'MG'),
('Filial - Ceará', 'Fortaleza - CE', 'CE');

-- Clientes
INSERT INTO clientes (nome, cnpj, email) VALUES
('Cotton Fibra Forte', '12.345.678/0001-90', 'contato@cottonfibra.com.br');

-- Usuário Admin padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, telefone, perfil, ativo) VALUES
('Administrador Sistema', 'admin@cottonfibra.com.br', '$2a$12$KwZ5XhLQjQYPGVvLJe5w..Dn7LhXhKxZJQFnL6T7U1gYYjJVYCmgS', '11999999999', 'ADMIN', true);

-- Terminais
INSERT INTO terminais (nome, tipo_acesso, cnpj, emails_contato, instrucoes_especificas) VALUES
('Terminal Santos', 'EMAIL', '98.765.432/0001-11', 'santos@terminal.com.br', 'Enviar documentação com 48h de antecedência'),
('Terminal Rio', 'LINK', '98.765.432/0001-12', 'rio@terminal.com.br', 'Acessar via portal específico'),
('Terminal Fortaleza', 'API', '98.765.432/0001-13', 'fortaleza@terminal.com.br', 'Integração automática via API');

-- Modelos de Carreta
INSERT INTO modelo_carretas (nome_descricao, motorista_nome, capacidade_maxima_fardos, peso_maximo_kg, comprimento_m, largura_m, altura_m) VALUES
('Carreta 3 eixos padrão', 'João Silva', 120, 28000, 13.5, 2.60, 2.80),
('Carreta bitrem', 'Maria Santos', 200, 30000, 17.5, 2.60, 2.80);

-- Transportadoras
INSERT INTO transportadoras (nome, cnpj, email) VALUES
('Transportes ABC', '11.111.111/0001-11', 'contato@transportesabc.com.br'),
('Fretes XYZ', '22.222.222/0001-22', 'contato@fretesxyz.com.br');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 1;
