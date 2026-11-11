-- Fase 3 (nov/2026): perfis GR e Visitante, acessos do cliente, retrato diário dos KPIs.
ALTER TYPE "PerfilUsuario" ADD VALUE 'GR';
ALTER TYPE "PerfilUsuario" ADD VALUE 'VISITANTE';

CREATE TYPE "TipoAcessoCliente" AS ENUM ('LINK', 'CONVITE');

CREATE TABLE "acessos_cliente" (
  "id" SERIAL NOT NULL,
  "tipo" "TipoAcessoCliente" NOT NULL,
  "cliente_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "email" TEXT,
  "expira_em" TIMESTAMP(3) NOT NULL,
  "gerado_por_id" INTEGER NOT NULL,
  "usado_em" TIMESTAMP(3),
  "aceito_em" TIMESTAMP(3),
  "usuario_id" INTEGER,
  "cancelado_em" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "acessos_cliente_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "acessos_cliente_token_hash_key" ON "acessos_cliente"("token_hash");
CREATE INDEX "acessos_cliente_cliente_id_idx" ON "acessos_cliente"("cliente_id");
ALTER TABLE "acessos_cliente" ADD CONSTRAINT "acessos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acessos_cliente" ADD CONSTRAINT "acessos_cliente_gerado_por_id_fkey" FOREIGN KEY ("gerado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acessos_cliente" ADD CONSTRAINT "acessos_cliente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kpis_diarios" (
  "id" SERIAL NOT NULL,
  "dia" DATE NOT NULL,
  "cargas_ativas" INTEGER NOT NULL,
  "em_risco" INTEGER NOT NULL,
  "fardos_pendentes" INTEGER NOT NULL,
  "taxa_cumprimento" DOUBLE PRECISION NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kpis_diarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kpis_diarios_dia_key" ON "kpis_diarios"("dia");

-- Meta da taxa de cumprimento do Dashboard (%), ajustável em Revisão de Dados › Parâmetros.
INSERT INTO "configuracoes_sistema" ("chave", "valor", "updated_at") VALUES ('meta_cumprimento', '85', CURRENT_TIMESTAMP)
ON CONFLICT ("chave") DO NOTHING;
