import sqlite3
import os

db_path = r'c:\xampp\htdocs\cotton\backend\dev.db'

# Remove o banco anterior se existir
if os.path.exists(db_path):
    os.remove(db_path)
    print("[OK] Database antigo removido")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# SQL para criar as tabelas baseado no schema Prisma
sql_create_tables = """
-- Clientes
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) UNIQUE NOT NULL,
  cnpj VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  contatos TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Origens/Filiais
CREATE TABLE origens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) UNIQUE NOT NULL,
  localizacao VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Terminais
CREATE TABLE terminais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) UNIQUE NOT NULL,
  tipo_acesso VARCHAR(20) NOT NULL,
  link_sistema VARCHAR(255),
  login VARCHAR(255),
  senha VARCHAR(255),
  cnpj VARCHAR(50),
  emails_contato TEXT,
  instrucoes_especificas TEXT,
  documentos_necessarios TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Modelo Carretas
CREATE TABLE modelo_carretas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_descricao VARCHAR(100) UNIQUE NOT NULL,
  motorista_nome VARCHAR(100),
  motorista_telefone VARCHAR(20),
  capacidade_maxima_fardos INTEGER NOT NULL,
  peso_maximo_kg INTEGER NOT NULL,
  comprimento_m DECIMAL(5, 2),
  largura_m DECIMAL(5, 2),
  altura_m DECIMAL(5, 2),
  caracteristicas_especiais TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transportadoras
CREATE TABLE transportadoras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) UNIQUE NOT NULL,
  cnpj VARCHAR(50) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Liberacoes
CREATE TABLE liberacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrucao VARCHAR(100) UNIQUE NOT NULL,
  data_liberacao DATE NOT NULL,
  data_coleta DATE NOT NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  origem_id INTEGER NOT NULL REFERENCES origens(id),
  destino VARCHAR(100) NOT NULL,
  terminal_id INTEGER NOT NULL REFERENCES terminais(id),
  local_coleta VARCHAR(100) NOT NULL,
  frete_empresa DECIMAL(10, 2) NOT NULL,
  total_fardos INTEGER NOT NULL,
  tipo_fardo VARCHAR(20) DEFAULT 'FARDAO',
  deadline DATE NOT NULL,
  carregado INTEGER DEFAULT 0,
  observacao TEXT,
  status VARCHAR(20) DEFAULT 'ATIVA',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Veiculos
CREATE TABLE veiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  liberacao_id INTEGER NOT NULL REFERENCES liberacoes(id) ON DELETE CASCADE,
  placa VARCHAR(20) NOT NULL,
  modelo_carreta_id INTEGER NOT NULL REFERENCES modelo_carretas(id),
  frete_motorista DECIMAL(10, 2) NOT NULL,
  qtd_fardos INTEGER NOT NULL,
  motorista_nome VARCHAR(100) NOT NULL,
  motorista_telefone VARCHAR(20) NOT NULL,
  motorista_cpf VARCHAR(255),
  motorista_email VARCHAR(100),
  transportadora_id INTEGER REFERENCES transportadoras(id),
  status VARCHAR(30) DEFAULT 'AGENDADO',
  data_agendamento DATETIME,
  data_carregamento DATETIME,
  data_descarga DATETIME,
  observacao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  perfil VARCHAR(30) NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  filial_id INTEGER REFERENCES origens(id),
  ativo BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alertas Config
CREATE TABLE alertas_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER REFERENCES clientes(id),
  terminal_id INTEGER REFERENCES terminais(id),
  tipo_alerta VARCHAR(50) NOT NULL,
  dias_antes INTEGER NOT NULL,
  canais TEXT,
  destinatarios TEXT,
  horario_inicio VARCHAR(5),
  horario_fim VARCHAR(5),
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alertas Log
CREATE TABLE alertas_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  liberacao_id INTEGER NOT NULL REFERENCES liberacoes(id),
  veiculo_id INTEGER REFERENCES veiculos(id),
  tipo_alerta VARCHAR(50) NOT NULL,
  canal VARCHAR(50) NOT NULL,
  destinatario VARCHAR(255) NOT NULL,
  dias_restantes INTEGER,
  placa_veiculo VARCHAR(20),
  mensagem TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDENTE',
  enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auditoria Log
CREATE TABLE auditoria_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tabela_afetada VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  acao VARCHAR(20) NOT NULL,
  dados_antigos TEXT,
  dados_novos TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_liberacoes_cliente ON liberacoes(cliente_id);
CREATE INDEX idx_liberacoes_deadline ON liberacoes(deadline);
CREATE INDEX idx_liberacoes_status ON liberacoes(status);
CREATE INDEX idx_veiculos_liberacao ON veiculos(liberacao_id);
CREATE INDEX idx_veiculos_placa ON veiculos(placa);
CREATE INDEX idx_veiculos_status ON veiculos(status);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_alertas_log_liberacao ON alertas_log(liberacao_id);
CREATE INDEX idx_alertas_log_enviado ON alertas_log(enviado_em);
CREATE INDEX idx_auditoria_usuario ON auditoria_log(usuario_id);
CREATE INDEX idx_auditoria_tabela ON auditoria_log(tabela_afetada);
"""

# Executa o SQL
try:
    cursor.executescript(sql_create_tables)
    conn.commit()
    print("[OK] Todas as tabelas criadas com sucesso")
except Exception as e:
    print(f"Erro ao criar tabelas: {e}")

# Agora insere os dados de seed
seed_sql = """
-- Inserir Clientes
INSERT INTO clientes (nome, cnpj, email) VALUES
('ADM', '00000000000001', 'contato@adm.com'),
('AMAGGI', '00000000000002', 'contato@amaggi.com'),
('BOA ESPERANÇA', '00000000000003', 'contato@boaesperanca.com'),
('BRASIL AGRO', '00000000000004', 'contato@brasilagro.com'),
('BUNGE', '00000000000005', 'contato@bunge.com'),
('CARGILL', '00000000000006', 'contato@cargill.com'),
('CARLOS POLATO', '00000000000007', 'contato@carlospolato.com'),
('CDI / STONEX', '00000000000008', 'contato@cdi.com'),
('COFCO', '00000000000009', 'contato@cofco.com'),
('COOAMI', '00000000000010', 'contato@cooami.com'),
('EMBRAPA', '00000000000011', 'contato@embrapa.com'),
('FIBRAFORTE', '00000000000012', 'contato@fibraforte.com'),
('LDC', '00000000000013', 'contato@ldc.com'),
('NUTRADE', '00000000000014', 'contato@nutrade.com'),
('SCHEFFER', '00000000000015', 'contato@scheffer.com'),
('SIFAEG', '00000000000016', 'contato@sifaeg.com'),
('SILO', '00000000000017', 'contato@silo.com'),
('SONAGRO', '00000000000018', 'contato@sonagro.com');

-- Inserir Origens
INSERT INTO origens (nome, localizacao, estado) VALUES
('ABADIA DE GOIAS-GO', 'Abadia de Goias', 'GO'),
('ABADIA DOS DOURADOS-MG', 'Abadia dos Dourados', 'MG'),
('ABADIANIA-GO', 'Abadiania', 'GO'),
('ABAETE-MG', 'Abaete', 'MG'),
('ABAIARA-CE', 'Abaiara', 'CE'),
('ABAIRA-BA', 'Abaira', 'BA'),
('ABARE-BA', 'Abare', 'BA'),
('ABATIA-PR', 'Abatia', 'PR'),
('PRIMAVERA DO LESTE-MT', 'Primavera do Leste', 'MT'),
('LUCAS DO RIO VERDE-MT', 'Lucas do Rio Verde', 'MT'),
('SINOP-MT', 'Sinop', 'MT'),
('SAPEZAL-MT', 'Sapezal', 'MT'),
('RONDONOPOLIS-MT', 'Rondonópolis', 'MT'),
('SORRISO-MT', 'Sorriso', 'MT'),
('CAMPO NOVO-MT', 'Campo Novo do Parecis', 'MT'),
('NOVA MUTUM-MT', 'Nova Mutum', 'MT'),
('ITIQUIRA-MT', 'Itiquira', 'MT'),
('BARRA DO GARCAS-MT', 'Barra do Garcas', 'MT'),
('CUIABA-MT', 'Cuiabá', 'MT'),
('VILA RICA-MT', 'Vila Rica', 'MT');

-- Inserir Terminais
INSERT INTO terminais (nome, tipo_acesso) VALUES
('NG REDEX', 'EMAIL'),
('SERRA TERMINAIS', 'LINK'),
('GELOG (PAULISTA TERMINAIS)', 'LINK'),
('ISIS TERMINAIS', 'LINK'),
('DINAMO', 'LINK'),
('TSL', 'LINK'),
('DALASTRA', 'LINK'),
('CORTÊS', 'LINK'),
('TMDL', 'LINK'),
('DEPOTCE (CESARI)', 'LINK'),
('DEPOTCE (CESARI) VIA PORTAL SILO', 'LINK'),
('MOVECTA (LOCAL FRIO)', 'EMAIL'),
('UNITRADING LOGISTICA', 'LINK'),
('DELLA VOLPE', 'EMAIL'),
('BCS CUBATÃO', 'EMAIL'),
('MOVECTA', 'LINK'),
('ALAMO', 'EMAIL'),
('SIGMA', 'LINK'),
('CONLINE', 'LINK'),
('MEDLOG', 'LINK');

-- Inserir Modelos de Carretas
INSERT INTO modelo_carretas (nome_descricao, capacidade_maxima_fardos, peso_maximo_kg) VALUES
('4º EIXOS', 180, 35000),
('4º EIXOS SIDER', 180, 35000),
('BITREM', 260, 57000),
('BITRUCK', 140, 29000),
('BITRUCK SIDER', 140, 29000),
('LS GRANELEIRO', 200, 45000),
('LS SIDER', 220, 45000),
('RODOTREM', 280, 74000),
('RODOTREM SIDER', 280, 74000),
('TRUCK', 100, 14000),
('TRUCK SIDER', 100, 14000),
('VANDERLEIA', 300, 57000),
('VANDERLEIA SIDER', 300, 57000);

-- Inserir Transportadoras
INSERT INTO transportadoras (nome, cnpj, email) VALUES
('FIBRA FORTE TRANSPORTES', '38948791000159', 'contato@fibraforte.com'),
('TRANSPORTADORA CENTRAL', '12345678000100', 'contato@central.com');

-- Inserir Usuário Admin
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
('Administrador', 'admin@cottonfibraforte.com', '$2a$12$gKlKU0kKP6.UuRNHoLTJKOqKf6V5QQzzz2S4h8Yd2.qEcD6C2BWHK', 'ADMIN');
"""

try:
    cursor.executescript(seed_sql)
    conn.commit()
except Exception as e:
    print(f"Erro ao inserir dados: {e}")

# Verifica os dados inseridos
cursor.execute("SELECT COUNT(*) FROM clientes")
clientes_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM origens")
origens_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM terminais")
terminais_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM modelo_carretas")
modelos_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM transportadoras")
transportadoras_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios_count = cursor.fetchone()[0]

print("\n[SUCCESS] Banco de dados criado e populado com sucesso!")
print(f"   - {clientes_count} clientes")
print(f"   - {origens_count} origens")
print(f"   - {terminais_count} terminais")
print(f"   - {modelos_count} modelos de carretas")
print(f"   - {transportadoras_count} transportadoras")
print(f"   - {usuarios_count} usuários")
print("\nDados para login:")
print("   Email: admin@cottonfibraforte.com")
print("   Senha: admin123")

conn.close()
