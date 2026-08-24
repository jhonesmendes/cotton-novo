-- CreateEnum
CREATE TYPE "StatusLiberacao" AS ENUM ('ATIVA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoFardo" AS ENUM ('FARDAO', 'FARDINHO');

-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('AGENDADO', 'CARREGADO', 'EM_TRANSITO', 'FINALIZADO', 'CANCELADO', 'LIBERADO', 'AGUARDANDO_CARREGAMENTO', 'AGUARDANDO_DESCARGA', 'AGUARDANDO_NFE', 'AGUARDANDO_GR', 'FALTA_AGENDAR', 'FALTA_CONTRATAR', 'SOLICITADO', 'PIX_PAGO', 'CARTA_FRETE');

-- CreateEnum
CREATE TYPE "TipoAcesso" AS ENUM ('EMAIL', 'LINK', 'API');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('DEADLINE_PROXIMO', 'CARGA_ATRASADA', 'SALDO_PENDENTE', 'STATUS_ALTERADO', 'DOCUMENTACAO_PENDENTE', 'AGENDAMENTO_NECESSARIO');

-- CreateEnum
CREATE TYPE "StatusAlerta" AS ENUM ('ENVIADO', 'FALHOU', 'PENDENTE');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'OPERADOR', 'GESTOR_FILIAL', 'VISUALIZADOR', 'CLIENTE');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "contatos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origens" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "origens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_coleta" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locais_coleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminais" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo_acesso" "TipoAcesso" NOT NULL,
    "link_sistema" TEXT,
    "login" TEXT,
    "senha" TEXT,
    "cnpj" TEXT,
    "emails_contato" TEXT,
    "instrucoes_especificas" TEXT,
    "documentos_necessarios" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_carretas" (
    "id" SERIAL NOT NULL,
    "nome_descricao" TEXT NOT NULL,
    "placa_veiculo" TEXT,
    "motorista_nome" TEXT,
    "motorista_telefone" TEXT,
    "capacidade_maxima_fardos" INTEGER NOT NULL,
    "peso_maximo_kg" INTEGER NOT NULL,
    "comprimento_m" DOUBLE PRECISION,
    "largura_m" DOUBLE PRECISION,
    "altura_m" DOUBLE PRECISION,
    "caracteristicas_especiais" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelo_carretas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referencias_cadastro" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referencias_cadastro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportadoras" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transportadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liberacoes" (
    "id" SERIAL NOT NULL,
    "instrucao" TEXT NOT NULL,
    "data_liberacao" TIMESTAMP(3) NOT NULL,
    "data_coleta" TIMESTAMP(3) NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "origem_id" INTEGER NOT NULL,
    "destino_id" INTEGER NOT NULL,
    "terminal_id" INTEGER NOT NULL,
    "local_coleta_id" INTEGER NOT NULL,
    "cliente_nome" TEXT,
    "filial_nome" TEXT,
    "destino_nome" TEXT,
    "origem_nome" TEXT,
    "local_coleta_nome" TEXT,
    "frete_empresa" DOUBLE PRECISION NOT NULL,
    "total_fardos" INTEGER NOT NULL,
    "tipo_fardo" "TipoFardo" NOT NULL DEFAULT 'FARDAO',
    "deadline" TIMESTAMP(3) NOT NULL,
    "carregado" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "status" "StatusLiberacao" NOT NULL DEFAULT 'ATIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liberacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "liberacao_id" INTEGER NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo_carreta_id" INTEGER NOT NULL,
    "frete_motorista" DOUBLE PRECISION NOT NULL,
    "qtd_fardos" INTEGER NOT NULL,
    "motorista_nome" TEXT NOT NULL,
    "motorista_telefone" TEXT NOT NULL,
    "motorista_cpf" TEXT,
    "motorista_email" TEXT,
    "transportadora_id" INTEGER,
    "status" "StatusVeiculo" NOT NULL DEFAULT 'AGENDADO',
    "data_agendamento" TIMESTAMP(3),
    "data_carregamento" TIMESTAMP(3),
    "data_descarga" TIMESTAMP(3),
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "telefone" TEXT,
    "perfil" "PerfilUsuario" NOT NULL,
    "cliente_id" INTEGER,
    "filial_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_config" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER,
    "terminal_id" INTEGER,
    "tipo_alerta" "TipoAlerta" NOT NULL,
    "dias_antes" INTEGER NOT NULL,
    "canais" TEXT,
    "destinatarios" TEXT,
    "horario_inicio" TEXT,
    "horario_fim" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_log" (
    "id" SERIAL NOT NULL,
    "liberacao_id" INTEGER NOT NULL,
    "veiculo_id" INTEGER,
    "tipo_alerta" "TipoAlerta" NOT NULL,
    "canal" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "dias_restantes" INTEGER,
    "placa_veiculo" TEXT,
    "mensagem" TEXT NOT NULL,
    "status" "StatusAlerta" NOT NULL DEFAULT 'PENDENTE',
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_log" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tabela_afetada" TEXT NOT NULL,
    "registro_id" INTEGER NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "dados_antigos" TEXT,
    "dados_novos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nome_key" ON "clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "origens_nome_key" ON "origens"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "destinos_nome_key" ON "destinos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "locais_coleta_nome_key" ON "locais_coleta"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "terminais_nome_key" ON "terminais"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "referencias_cadastro_tipo_valor_key" ON "referencias_cadastro"("tipo", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "transportadoras_nome_key" ON "transportadoras"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "transportadoras_cnpj_key" ON "transportadoras"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "liberacoes_instrucao_key" ON "liberacoes"("instrucao");

-- CreateIndex
CREATE INDEX "liberacoes_cliente_id_idx" ON "liberacoes"("cliente_id");

-- CreateIndex
CREATE INDEX "liberacoes_deadline_idx" ON "liberacoes"("deadline");

-- CreateIndex
CREATE INDEX "liberacoes_status_idx" ON "liberacoes"("status");

-- CreateIndex
CREATE INDEX "veiculos_liberacao_id_idx" ON "veiculos"("liberacao_id");

-- CreateIndex
CREATE INDEX "veiculos_placa_idx" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_status_idx" ON "veiculos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "alertas_log_liberacao_id_idx" ON "alertas_log"("liberacao_id");

-- CreateIndex
CREATE INDEX "alertas_log_enviado_em_idx" ON "alertas_log"("enviado_em");

-- CreateIndex
CREATE INDEX "auditoria_log_tabela_afetada_idx" ON "auditoria_log"("tabela_afetada");

-- CreateIndex
CREATE INDEX "auditoria_log_created_at_idx" ON "auditoria_log"("created_at");

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "origens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_local_coleta_id_fkey" FOREIGN KEY ("local_coleta_id") REFERENCES "locais_coleta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_liberacao_id_fkey" FOREIGN KEY ("liberacao_id") REFERENCES "liberacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_modelo_carreta_id_fkey" FOREIGN KEY ("modelo_carreta_id") REFERENCES "modelo_carretas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_transportadora_id_fkey" FOREIGN KEY ("transportadora_id") REFERENCES "transportadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "origens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_config" ADD CONSTRAINT "alertas_config_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_config" ADD CONSTRAINT "alertas_config_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_log" ADD CONSTRAINT "alertas_log_liberacao_id_fkey" FOREIGN KEY ("liberacao_id") REFERENCES "liberacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_log" ADD CONSTRAINT "alertas_log_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_log" ADD CONSTRAINT "auditoria_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
