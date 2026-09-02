-- Seed data script for Cotton Fibra Forte Database

-- Limpar dados existentes (se necessário)
-- DELETE FROM usuarios;
-- DELETE FROM transportadoras;
-- DELETE FROM modelo_carretas;
-- DELETE FROM terminais;
-- DELETE FROM origens;
-- DELETE FROM clientes;

-- Inserir Clientes
INSERT OR IGNORE INTO clientes (nome, cnpj, email, created_at, updated_at) VALUES
('ADM', '00000000000001', 'contato@adm.com', datetime('now'), datetime('now')),
('AMAGGI', '00000000000002', 'contato@amaggi.com', datetime('now'), datetime('now')),
('BOA ESPERANCA', '00000000000003', 'contato@boaesperanca.com', datetime('now'), datetime('now')),
('BRASIL AGRO', '00000000000004', 'contato@brasilagro.com', datetime('now'), datetime('now')),
('BUNGE', '00000000000005', 'contato@bunge.com', datetime('now'), datetime('now')),
('CARGILL', '00000000000006', 'contato@cargill.com', datetime('now'), datetime('now')),
('CARLOS POLATO', '00000000000007', 'contato@carlospolato.com', datetime('now'), datetime('now')),
('CDI / STONEX', '00000000000008', 'contato@cdi.com', datetime('now'), datetime('now')),
('COFCO', '00000000000009', 'contato@cofco.com', datetime('now'), datetime('now')),
('COOAMI', '00000000000010', 'contato@cooami.com', datetime('now'), datetime('now')),
('EMBRAPA', '00000000000011', 'contato@embrapa.com', datetime('now'), datetime('now')),
('FIBRAFORTE', '00000000000012', 'contato@fibraforte.com', datetime('now'), datetime('now')),
('LDC', '00000000000013', 'contato@ldc.com', datetime('now'), datetime('now')),
('NUTRADE', '00000000000014', 'contato@nutrade.com', datetime('now'), datetime('now')),
('SCHEFFER', '00000000000015', 'contato@scheffer.com', datetime('now'), datetime('now')),
('SIFAEG', '00000000000016', 'contato@sifaeg.com', datetime('now'), datetime('now')),
('SILO', '00000000000017', 'contato@silo.com', datetime('now'), datetime('now')),
('SONAGRO', '00000000000018', 'contato@sonagro.com', datetime('now'), datetime('now'));

-- Inserir Origens/Filiais
INSERT OR IGNORE INTO origens (nome, localizacao, estado, created_at) VALUES
('ABADIA DE GOIAS-GO', 'Abadia de Goias', 'GO', datetime('now')),
('ABADIA DOS DOURADOS-MG', 'Abadia dos Dourados', 'MG', datetime('now')),
('ABADIANIA-GO', 'Abadiania', 'GO', datetime('now')),
('ABAETE-MG', 'Abaete', 'MG', datetime('now')),
('ABAIARA-CE', 'Abaiara', 'CE', datetime('now')),
('ABAIRA-BA', 'Abaira', 'BA', datetime('now')),
('ABARE-BA', 'Abare', 'BA', datetime('now')),
('ABATIA-PR', 'Abatia', 'PR', datetime('now')),
('PRIMAVERA DO LESTE-MT', 'Primavera do Leste', 'MT', datetime('now')),
('LUCAS DO RIO VERDE-MT', 'Lucas do Rio Verde', 'MT', datetime('now')),
('SINOP-MT', 'Sinop', 'MT', datetime('now')),
('SAPEZAL-MT', 'Sapezal', 'MT', datetime('now')),
('RONDONOPOLIS-MT', 'Rondonópolis', 'MT', datetime('now')),
('SORRISO-MT', 'Sorriso', 'MT', datetime('now')),
('CAMPO NOVO-MT', 'Campo Novo do Parecis', 'MT', datetime('now')),
('NOVA MUTUM-MT', 'Nova Mutum', 'MT', datetime('now')),
('ITIQUIRA-MT', 'Itiquira', 'MT', datetime('now')),
('BARRA DO GARCAS-MT', 'Barra do Garcas', 'MT', datetime('now')),
('CUIABA-MT', 'Cuiabá', 'MT', datetime('now')),
('VILA RICA-MT', 'Vila Rica', 'MT', datetime('now'));

-- Inserir Terminais
INSERT OR IGNORE INTO terminais (nome, tipo_acesso, created_at, updated_at) VALUES
('NG REDEX', 'EMAIL', datetime('now'), datetime('now')),
('SERRA TERMINAIS', 'LINK', datetime('now'), datetime('now')),
('GELOG (PAULISTA TERMINAIS)', 'LINK', datetime('now'), datetime('now')),
('ISIS TERMINAIS', 'LINK', datetime('now'), datetime('now')),
('DINAMO', 'LINK', datetime('now'), datetime('now')),
('TSL', 'LINK', datetime('now'), datetime('now')),
('DALASTRA', 'LINK', datetime('now'), datetime('now')),
('CORTÊS', 'LINK', datetime('now'), datetime('now')),
('TMDL', 'LINK', datetime('now'), datetime('now')),
('DEPOTCE (CESARI)', 'LINK', datetime('now'), datetime('now')),
('DEPOTCE (CESARI) VIA PORTAL SILO', 'LINK', datetime('now'), datetime('now')),
('MOVECTA (LOCAL FRIO)', 'EMAIL', datetime('now'), datetime('now')),
('UNITRADING LOGISTICA', 'LINK', datetime('now'), datetime('now')),
('DELLA VOLPE', 'EMAIL', datetime('now'), datetime('now')),
('BCS CUBATÃO', 'EMAIL', datetime('now'), datetime('now')),
('MOVECTA', 'LINK', datetime('now'), datetime('now')),
('ALAMO', 'EMAIL', datetime('now'), datetime('now')),
('SIGMA', 'LINK', datetime('now'), datetime('now')),
('CONLINE', 'LINK', datetime('now'), datetime('now')),
('MEDLOG', 'LINK', datetime('now'), datetime('now'));

-- Inserir Modelos de Carretas
INSERT OR IGNORE INTO modelo_carretas (nome_descricao, capacidade_maxima_fardos, peso_maximo_kg, ativo, created_at, updated_at) VALUES
('4º EIXOS', 180, 35000, 1, datetime('now'), datetime('now')),
('4º EIXOS SIDER', 180, 35000, 1, datetime('now'), datetime('now')),
('BITREM', 260, 57000, 1, datetime('now'), datetime('now')),
('BITRUCK', 140, 29000, 1, datetime('now'), datetime('now')),
('BITRUCK SIDER', 140, 29000, 1, datetime('now'), datetime('now')),
('LS GRANELEIRO', 200, 45000, 1, datetime('now'), datetime('now')),
('LS SIDER', 220, 45000, 1, datetime('now'), datetime('now')),
('RODOTREM', 280, 74000, 1, datetime('now'), datetime('now')),
('RODOTREM SIDER', 280, 74000, 1, datetime('now'), datetime('now')),
('TRUCK', 100, 14000, 1, datetime('now'), datetime('now')),
('TRUCK SIDER', 100, 14000, 1, datetime('now'), datetime('now')),
('VANDERLEIA', 300, 57000, 1, datetime('now'), datetime('now')),
('VANDERLEIA SIDER', 300, 57000, 1, datetime('now'), datetime('now'));

-- Inserir Transportadoras
INSERT OR IGNORE INTO transportadoras (nome, cnpj, email, created_at) VALUES
('FIBRA FORTE TRANSPORTES', '38948791000159', 'contato@fibraforte.com', datetime('now')),
('TRANSPORTADORA CENTRAL', '12345678000100', 'contato@central.com', datetime('now'));

-- Inserir Usuário Admin
INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, perfil, ativo, created_at, updated_at) VALUES
('Administrador', 'admin@cottonfibraforte.com', '$2a$12$YourBcryptHashHere', 'ADMIN', 1, datetime('now'), datetime('now'));
