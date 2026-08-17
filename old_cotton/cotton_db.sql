-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 23/06/2026 às 15:54
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `cotton_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `alertas_config`
--

CREATE TABLE `alertas_config` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `terminal_id` int(11) DEFAULT NULL,
  `tipo_alerta` enum('DEADLINE_PROXIMO','CARGA_ATRASADA','SALDO_PENDENTE','STATUS_ALTERADO','DOCUMENTACAO_PENDENTE','AGENDAMENTO_NECESSARIO') NOT NULL,
  `dias_antes` int(11) NOT NULL,
  `canais` varchar(191) DEFAULT NULL,
  `destinatarios` varchar(191) DEFAULT NULL,
  `horario_inicio` varchar(191) DEFAULT NULL,
  `horario_fim` varchar(191) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `alertas_log`
--

CREATE TABLE `alertas_log` (
  `id` int(11) NOT NULL,
  `liberacao_id` int(11) NOT NULL,
  `veiculo_id` int(11) DEFAULT NULL,
  `tipo_alerta` enum('DEADLINE_PROXIMO','CARGA_ATRASADA','SALDO_PENDENTE','STATUS_ALTERADO','DOCUMENTACAO_PENDENTE','AGENDAMENTO_NECESSARIO') NOT NULL,
  `canal` varchar(191) NOT NULL,
  `destinatario` varchar(191) NOT NULL,
  `dias_restantes` int(11) DEFAULT NULL,
  `placa_veiculo` varchar(191) DEFAULT NULL,
  `mensagem` varchar(191) NOT NULL,
  `status` enum('ENVIADO','FALHOU','PENDENTE') NOT NULL DEFAULT 'PENDENTE',
  `enviado_em` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `auditoria_log`
--

CREATE TABLE `auditoria_log` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tabela_afetada` varchar(191) NOT NULL,
  `registro_id` int(11) NOT NULL,
  `acao` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `dados_antigos` varchar(191) DEFAULT NULL,
  `dados_novos` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `cnpj` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `contatos` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `clientes`
--

INSERT INTO `clientes` (`id`, `nome`, `cnpj`, `email`, `contatos`, `created_at`, `updated_at`) VALUES
(1, 'ADM', '00000000000001', 'contato@adm.com', NULL, '2026-05-13 22:41:14.757', '2026-05-13 22:41:14.757'),
(2, 'AMAGGI', '00000000000002', 'contato@amaggi.com', NULL, '2026-05-13 22:41:14.767', '2026-05-13 22:41:14.767'),
(3, 'BOA ESPERANÇA', '00000000000003', 'contato@boaesperança.com', NULL, '2026-05-13 22:41:14.775', '2026-05-13 22:41:14.775'),
(4, 'BRASIL AGRO', '00000000000004', 'contato@brasilagro.com', NULL, '2026-05-13 22:41:14.779', '2026-05-13 22:41:14.779'),
(5, 'BUNGE', '00000000000005', 'contato@bunge.com', NULL, '2026-05-13 22:41:14.784', '2026-05-13 22:41:14.784'),
(6, 'CARGILL', '00000000000006', 'contato@cargill.com', NULL, '2026-05-13 22:41:14.788', '2026-05-13 22:41:14.788'),
(7, 'CARLOS POLATO', '00000000000007', 'contato@carlospolato.com', NULL, '2026-05-13 22:41:14.791', '2026-05-13 22:41:14.791'),
(8, 'CDI / STONEX', '00000000000008', 'contato@cdi/stonex.com', NULL, '2026-05-13 22:41:14.794', '2026-05-13 22:41:14.794'),
(9, 'COFCO', '00000000000009', 'contato@cofco.com', NULL, '2026-05-13 22:41:14.798', '2026-05-13 22:41:14.798'),
(10, 'COOAMI', '00000000000010', 'contato@cooami.com', NULL, '2026-05-13 22:41:14.802', '2026-05-13 22:41:14.802'),
(11, 'LDC', '00000000000011', 'contato@ldc.com', NULL, '2026-05-13 22:41:14.806', '2026-05-13 22:41:14.806'),
(12, 'LOCKS', '00000000000012', 'contato@locks.com', NULL, '2026-05-13 22:41:14.809', '2026-05-13 22:41:14.809'),
(13, 'NUTRADE', '00000000000013', 'contato@nutrade.com', NULL, '2026-05-13 22:41:14.812', '2026-05-13 22:41:14.812'),
(14, 'OMNICOTTON', '00000000000014', 'contato@omnicotton.com', NULL, '2026-05-13 22:41:14.815', '2026-05-13 22:41:14.815'),
(15, 'PICCININ', '00000000000015', 'contato@piccinin.com', NULL, '2026-05-13 22:41:14.819', '2026-05-13 22:41:14.819'),
(16, 'SCHEFFER', '00000000000016', 'contato@scheffer.com', NULL, '2026-05-13 22:41:14.822', '2026-05-13 22:41:14.822'),
(17, 'SCHENKEL', '00000000000017', 'contato@schenkel.com', NULL, '2026-05-13 22:41:14.826', '2026-05-13 22:41:14.826'),
(18, 'SLC', '00000000000018', 'contato@slc.com', NULL, '2026-05-13 22:41:14.829', '2026-05-13 22:41:14.829');

-- --------------------------------------------------------

--
-- Estrutura para tabela `destinos`
--

CREATE TABLE `destinos` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `estado` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `destinos`
--

INSERT INTO `destinos` (`id`, `nome`, `estado`, `created_at`) VALUES
(1, 'RONDONOPOLIS - MT', 'MT', '2026-05-18 14:12:56.528'),
(2, 'SANTOS -SP', 'SP', '2026-05-18 14:15:37.834'),
(3, 'CUBATAO - SP', 'SP', '2026-05-18 14:15:48.538'),
(4, 'AMERICANA - SP', 'SP', '2026-05-18 14:16:00.421'),
(5, 'GUARUJA - SP', 'SP', '2026-05-18 14:16:08.379'),
(6, 'HORIZONTE - CE', 'CE', '2026-05-18 14:16:20.532'),
(7, 'NOVO SAO JOAQUIM - MT', 'MT', '2026-05-18 19:29:40.697');

-- --------------------------------------------------------

--
-- Estrutura para tabela `liberacoes`
--

CREATE TABLE `liberacoes` (
  `id` int(11) NOT NULL,
  `instrucao` varchar(191) NOT NULL,
  `data_liberacao` datetime(3) NOT NULL,
  `data_coleta` datetime(3) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `origem_id` int(11) NOT NULL,
  `terminal_id` int(11) NOT NULL,
  `frete_empresa` double NOT NULL,
  `total_fardos` int(11) NOT NULL,
  `tipo_fardo` enum('FARDAO','FARDINHO') NOT NULL DEFAULT 'FARDAO',
  `deadline` datetime(3) NOT NULL,
  `carregado` int(11) NOT NULL DEFAULT 0,
  `observacao` varchar(191) DEFAULT NULL,
  `status` enum('ATIVA','CONCLUIDA','CANCELADA') NOT NULL DEFAULT 'ATIVA',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `destino_id` int(11) NOT NULL,
  `local_coleta_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `liberacoes`
--

INSERT INTO `liberacoes` (`id`, `instrucao`, `data_liberacao`, `data_coleta`, `cliente_id`, `origem_id`, `terminal_id`, `frete_empresa`, `total_fardos`, `tipo_fardo`, `deadline`, `carregado`, `observacao`, `status`, `created_at`, `updated_at`, `destino_id`, `local_coleta_id`) VALUES
(1, 'S07453-MÃE-JAN-01', '2026-01-20 00:00:00.000', '2026-01-20 00:00:00.000', 9, 5, 8, 670, 1206, 'FARDINHO', '2026-02-16 00:00:00.000', 0, '', 'CANCELADA', '2026-05-18 20:57:56.616', '2026-05-18 21:04:40.463', 2, 1),
(2, 'S51626.A03', '2026-04-13 00:00:00.000', '2026-04-13 00:00:00.000', 3, 5, 8, 640, 471, 'FARDINHO', '2026-04-25 00:00:00.000', 471, '', 'CONCLUIDA', '2026-05-18 21:07:39.197', '2026-05-21 12:32:19.567', 3, 3);

-- --------------------------------------------------------

--
-- Estrutura para tabela `locais_coleta`
--

CREATE TABLE `locais_coleta` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `cidade` varchar(191) DEFAULT NULL,
  `estado` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `locais_coleta`
--

INSERT INTO `locais_coleta` (`id`, `nome`, `cidade`, `estado`, `created_at`) VALUES
(1, 'ALG ITAQUERE ', NULL, 'MT', '2026-05-18 17:47:35.457'),
(2, 'ALG S COTTON', NULL, 'MT', '2026-05-18 20:54:16.839'),
(3, 'ALG RIO VERDE', NULL, 'MT', '2026-05-18 21:06:18.202');

-- --------------------------------------------------------

--
-- Estrutura para tabela `modelo_carretas`
--

CREATE TABLE `modelo_carretas` (
  `id` int(11) NOT NULL,
  `nome_descricao` varchar(191) NOT NULL,
  `motorista_nome` varchar(191) DEFAULT NULL,
  `motorista_telefone` varchar(191) DEFAULT NULL,
  `capacidade_maxima_fardos` int(11) NOT NULL,
  `peso_maximo_kg` int(11) NOT NULL,
  `comprimento_m` double DEFAULT NULL,
  `largura_m` double DEFAULT NULL,
  `altura_m` double DEFAULT NULL,
  `caracteristicas_especiais` varchar(191) DEFAULT NULL,
  `observacoes` varchar(191) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `placa_veiculo` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `modelo_carretas`
--

INSERT INTO `modelo_carretas` (`id`, `nome_descricao`, `motorista_nome`, `motorista_telefone`, `capacidade_maxima_fardos`, `peso_maximo_kg`, `comprimento_m`, `largura_m`, `altura_m`, `caracteristicas_especiais`, `observacoes`, `ativo`, `created_at`, `updated_at`, `placa_veiculo`) VALUES
(1, '4º EIXOS SIDER', 'REGIS HENRIQUE MARIA', '(48) 99800-9665', 162, 45000, NULL, NULL, NULL, NULL, '', 1, '2026-05-18 21:21:06.896', '2026-05-18 21:42:51.384', NULL),
(2, 'VANDERLEIA', 'CLAUDEMIR POSITO', '(17)99701-1105', 160, 5500, NULL, NULL, NULL, NULL, '', 1, '2026-05-18 21:31:32.747', '2026-05-18 21:31:32.747', NULL),
(3, 'LS SIDER', 'ROBSON FERNANDES DA SILVA', '(65)98105-8513', 149, 55, NULL, NULL, NULL, NULL, '', 1, '2026-05-18 21:33:26.366', '2026-05-18 21:33:26.366', NULL),
(4, 'BITREM', 'DEAJAN MATHEUS RODRIGUES', '(66)99214-8906', 200, 5600, NULL, NULL, NULL, NULL, '', 1, '2026-05-18 21:44:31.447', '2026-05-18 21:44:31.447', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `origens`
--

CREATE TABLE `origens` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `localizacao` varchar(191) NOT NULL,
  `estado` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `origens`
--

INSERT INTO `origens` (`id`, `nome`, `localizacao`, `estado`, `created_at`) VALUES
(3, 'PRIMAVERA DO LESTE - MT', 'PRIMAVERA DO LESTE', 'MT', '2026-05-13 22:41:14.843'),
(4, 'SAPEZAL - MT', 'SAPEZAL', 'MT', '2026-05-13 22:41:14.846'),
(5, 'LUCAS DO RIO VERDE - MT', 'LUCAS DO RIO VERDE', 'MT', '2026-05-13 22:41:14.848'),
(6, 'SINOP - MT', 'SINOP', 'MT', '2026-05-13 22:41:14.852'),
(7, 'NOVA MUTUM - MT', 'NOVA MUTUM', 'MT', '2026-05-13 22:41:14.855'),
(8, 'NOVO SAO JOAQUIM - MT', 'CAMPO NOVO', 'MT', '2026-05-13 22:41:14.857');

-- --------------------------------------------------------

--
-- Estrutura para tabela `terminais`
--

CREATE TABLE `terminais` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `tipo_acesso` enum('EMAIL','LINK','API') NOT NULL,
  `link_sistema` varchar(191) DEFAULT NULL,
  `login` varchar(191) DEFAULT NULL,
  `senha` varchar(191) DEFAULT NULL,
  `cnpj` varchar(191) DEFAULT NULL,
  `emails_contato` varchar(191) DEFAULT NULL,
  `instrucoes_especificas` varchar(191) DEFAULT NULL,
  `documentos_necessarios` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `terminais`
--

INSERT INTO `terminais` (`id`, `nome`, `tipo_acesso`, `link_sistema`, `login`, `senha`, `cnpj`, `emails_contato`, `instrucoes_especificas`, `documentos_necessarios`, `created_at`, `updated_at`) VALUES
(3, 'VITÓRIA - PEIÚ', 'EMAIL', NULL, 'vitoria@terminal.com', 'senha123', NULL, NULL, NULL, NULL, '2026-05-13 22:42:57.203', '2026-05-13 22:42:57.203'),
(5, 'IPIRANGA DO NORTE - MT', 'LINK', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-18 20:50:13.660', '2026-05-18 20:50:13.660'),
(6, 'TAPURAH - MT', 'LINK', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-18 20:50:34.730', '2026-05-18 20:50:34.730'),
(7, 'CAMPOS DE JULIO - MT', 'LINK', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-18 20:52:10.727', '2026-05-18 20:52:10.727'),
(8, 'LUCAS DO RIO VERDE - MT', 'LINK', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-18 20:53:23.559', '2026-05-18 20:53:23.559');

-- --------------------------------------------------------

--
-- Estrutura para tabela `transportadoras`
--

CREATE TABLE `transportadoras` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `cnpj` varchar(191) NOT NULL,
  `telefone` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nome` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `senha_hash` varchar(191) NOT NULL,
  `telefone` varchar(191) DEFAULT NULL,
  `perfil` enum('ADMIN','OPERADOR','GESTOR_FILIAL','VISUALIZADOR','CLIENTE') NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `filial_id` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `telefone`, `perfil`, `cliente_id`, `filial_id`, `ativo`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'Administrador', 'admin@cottonfibraforte.com', '$2a$12$Czxc31ZcP90pFa25jQmAIu48P6O8l5q0qGnLi8wO0jA8ABQwkvScm', NULL, 'ADMIN', NULL, NULL, 1, '2026-06-23 12:49:53.645', '2026-05-13 22:42:57.181', '2026-06-23 12:49:53.648');

-- --------------------------------------------------------

--
-- Estrutura para tabela `veiculos`
--

CREATE TABLE `veiculos` (
  `id` int(11) NOT NULL,
  `liberacao_id` int(11) NOT NULL,
  `placa` varchar(191) NOT NULL,
  `modelo_carreta_id` int(11) NOT NULL,
  `frete_motorista` double NOT NULL,
  `qtd_fardos` int(11) NOT NULL,
  `motorista_nome` varchar(191) NOT NULL,
  `motorista_telefone` varchar(191) NOT NULL,
  `motorista_cpf` varchar(191) DEFAULT NULL,
  `motorista_email` varchar(191) DEFAULT NULL,
  `transportadora_id` int(11) DEFAULT NULL,
  `status` enum('AGENDADO','CARREGADO','EM_TRANSITO','FINALIZADO','LIBERADO','AGUARDANDO_CARREGAMENTO','AGUARDANDO_DESCARGA','AGUARDANDO_NFE','AGUARDANDO_GR','FALTA_AGENDAR','FALTA_CONTRATAR','SOLICITADO','PIX_PAGO','CARTA_FRETE') NOT NULL DEFAULT 'AGENDADO',
  `data_agendamento` datetime(3) DEFAULT NULL,
  `data_carregamento` datetime(3) DEFAULT NULL,
  `data_descarga` datetime(3) DEFAULT NULL,
  `observacao` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `veiculos`
--

INSERT INTO `veiculos` (`id`, `liberacao_id`, `placa`, `modelo_carreta_id`, `frete_motorista`, `qtd_fardos`, `motorista_nome`, `motorista_telefone`, `motorista_cpf`, `motorista_email`, `transportadora_id`, `status`, `data_agendamento`, `data_carregamento`, `data_descarga`, `observacao`, `created_at`, `updated_at`) VALUES
(1, 2, 'RYN4F30', 1, 560, 162, 'REGIS HENRIQUE MARIA', '48998009665', '05664548908', NULL, NULL, 'FINALIZADO', NULL, NULL, NULL, '', '2026-05-18 21:28:10.285', '2026-05-21 12:32:17.194'),
(2, 2, 'FPS9566', 2, 570, 160, 'CLAUDEMIR POSITO', '17997011105', '07063567802', NULL, NULL, 'FINALIZADO', NULL, NULL, NULL, '', '2026-05-18 21:31:54.122', '2026-05-19 15:35:00.211'),
(3, 2, 'QCD0H00', 3, 560, 149, 'ROBSON FERNANDES DA SILVA', '65981058513', '72320680187', NULL, NULL, 'FINALIZADO', NULL, NULL, NULL, '', '2026-05-18 21:34:16.671', '2026-05-21 12:32:19.546');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `alertas_config`
--
ALTER TABLE `alertas_config`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alertas_config_cliente_id_fkey` (`cliente_id`),
  ADD KEY `alertas_config_terminal_id_fkey` (`terminal_id`);

--
-- Índices de tabela `alertas_log`
--
ALTER TABLE `alertas_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alertas_log_liberacao_id_idx` (`liberacao_id`),
  ADD KEY `alertas_log_enviado_em_idx` (`enviado_em`),
  ADD KEY `alertas_log_veiculo_id_fkey` (`veiculo_id`);

--
-- Índices de tabela `auditoria_log`
--
ALTER TABLE `auditoria_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `auditoria_log_tabela_afetada_idx` (`tabela_afetada`),
  ADD KEY `auditoria_log_created_at_idx` (`created_at`),
  ADD KEY `auditoria_log_usuario_id_fkey` (`usuario_id`);

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clientes_nome_key` (`nome`),
  ADD UNIQUE KEY `clientes_cnpj_key` (`cnpj`);

--
-- Índices de tabela `destinos`
--
ALTER TABLE `destinos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `destinos_nome_key` (`nome`);

--
-- Índices de tabela `liberacoes`
--
ALTER TABLE `liberacoes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `liberacoes_instrucao_key` (`instrucao`),
  ADD KEY `liberacoes_cliente_id_idx` (`cliente_id`),
  ADD KEY `liberacoes_deadline_idx` (`deadline`),
  ADD KEY `liberacoes_status_idx` (`status`),
  ADD KEY `liberacoes_origem_id_fkey` (`origem_id`),
  ADD KEY `liberacoes_terminal_id_fkey` (`terminal_id`),
  ADD KEY `liberacoes_destino_id_fkey` (`destino_id`),
  ADD KEY `liberacoes_local_coleta_id_fkey` (`local_coleta_id`);

--
-- Índices de tabela `locais_coleta`
--
ALTER TABLE `locais_coleta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `locais_coleta_nome_key` (`nome`);

--
-- Índices de tabela `modelo_carretas`
--
ALTER TABLE `modelo_carretas`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `origens`
--
ALTER TABLE `origens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `origens_nome_key` (`nome`);

--
-- Índices de tabela `terminais`
--
ALTER TABLE `terminais`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `terminais_nome_key` (`nome`);

--
-- Índices de tabela `transportadoras`
--
ALTER TABLE `transportadoras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transportadoras_nome_key` (`nome`),
  ADD UNIQUE KEY `transportadoras_cnpj_key` (`cnpj`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuarios_email_key` (`email`),
  ADD KEY `usuarios_email_idx` (`email`),
  ADD KEY `usuarios_cliente_id_fkey` (`cliente_id`),
  ADD KEY `usuarios_filial_id_fkey` (`filial_id`);

--
-- Índices de tabela `veiculos`
--
ALTER TABLE `veiculos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `veiculos_liberacao_id_idx` (`liberacao_id`),
  ADD KEY `veiculos_placa_idx` (`placa`),
  ADD KEY `veiculos_status_idx` (`status`),
  ADD KEY `veiculos_modelo_carreta_id_fkey` (`modelo_carreta_id`),
  ADD KEY `veiculos_transportadora_id_fkey` (`transportadora_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `alertas_config`
--
ALTER TABLE `alertas_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `alertas_log`
--
ALTER TABLE `alertas_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `auditoria_log`
--
ALTER TABLE `auditoria_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de tabela `destinos`
--
ALTER TABLE `destinos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `liberacoes`
--
ALTER TABLE `liberacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `locais_coleta`
--
ALTER TABLE `locais_coleta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `modelo_carretas`
--
ALTER TABLE `modelo_carretas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `origens`
--
ALTER TABLE `origens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de tabela `terminais`
--
ALTER TABLE `terminais`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `transportadoras`
--
ALTER TABLE `transportadoras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `veiculos`
--
ALTER TABLE `veiculos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `alertas_config`
--
ALTER TABLE `alertas_config`
  ADD CONSTRAINT `alertas_config_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alertas_config_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminais` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `alertas_log`
--
ALTER TABLE `alertas_log`
  ADD CONSTRAINT `alertas_log_liberacao_id_fkey` FOREIGN KEY (`liberacao_id`) REFERENCES `liberacoes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `alertas_log_veiculo_id_fkey` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `auditoria_log`
--
ALTER TABLE `auditoria_log`
  ADD CONSTRAINT `auditoria_log_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `liberacoes`
--
ALTER TABLE `liberacoes`
  ADD CONSTRAINT `liberacoes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liberacoes_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `destinos` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liberacoes_local_coleta_id_fkey` FOREIGN KEY (`local_coleta_id`) REFERENCES `locais_coleta` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liberacoes_origem_id_fkey` FOREIGN KEY (`origem_id`) REFERENCES `origens` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liberacoes_terminal_id_fkey` FOREIGN KEY (`terminal_id`) REFERENCES `terminais` (`id`) ON UPDATE CASCADE;

--
-- Restrições para tabelas `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `usuarios_filial_id_fkey` FOREIGN KEY (`filial_id`) REFERENCES `origens` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `veiculos`
--
ALTER TABLE `veiculos`
  ADD CONSTRAINT `veiculos_liberacao_id_fkey` FOREIGN KEY (`liberacao_id`) REFERENCES `liberacoes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `veiculos_modelo_carreta_id_fkey` FOREIGN KEY (`modelo_carreta_id`) REFERENCES `modelo_carretas` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `veiculos_transportadora_id_fkey` FOREIGN KEY (`transportadora_id`) REFERENCES `transportadoras` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
