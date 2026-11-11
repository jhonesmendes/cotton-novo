-- Fase 1 das melhorias de nov/2026:
--  * nova timeline de 8 etapas do veículo (substitui os 15 status antigos);
--  * excluir veículo passa a inativar (CANCELADO vira veículo inativo);
--  * status SUSPENSA na liberação; peso da instrução; checklist de fechamento;
--  * rastreamento PENDENTE, isca Sim/Não, forma de pagamento;
--  * peso carregado digitado em kg por engano é convertido para toneladas;
--  * tabela de parâmetros do sistema.

-- ─── Liberação ────────────────────────────────────────────────────────────────
ALTER TYPE "StatusLiberacao" ADD VALUE 'SUSPENSA';

ALTER TABLE "liberacoes"
  ADD COLUMN "peso_total" DOUBLE PRECISION,
  ADD COLUMN "pendencias_fechamento" TEXT,
  ADD COLUMN "motivo_suspensao" TEXT,
  ADD COLUMN "suspensa_por" TEXT,
  ADD COLUMN "suspensa_em" TIMESTAMP(3);

-- ─── Veículo: inativação, isca, forma de pagamento ─────────────────────────────
ALTER TABLE "veiculos"
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "motivo_inativacao" TEXT,
  ADD COLUMN "inativado_por" TEXT,
  ADD COLUMN "inativado_em" TIMESTAMP(3),
  ADD COLUMN "motivo_reativacao" TEXT,
  ADD COLUMN "possui_isca" BOOLEAN,
  ADD COLUMN "forma_pagamento" TEXT;

CREATE INDEX "veiculos_ativo_idx" ON "veiculos"("ativo");

-- Não existe mais CANCELADO: vira veículo inativo (o status é remapeado abaixo).
UPDATE "veiculos"
SET "ativo" = false,
    "motivo_inativacao" = 'Cancelado antes da nova timeline (migração nov/2026)',
    "inativado_em" = "updated_at"
WHERE "status"::text = 'CANCELADO';

-- Isca já informada = respondeu "Sim".
UPDATE "veiculos" SET "possui_isca" = true WHERE COALESCE(TRIM("numero_isca"), '') <> '';

-- ─── Nova timeline do veículo ─────────────────────────────────────────────────
CREATE TYPE "StatusVeiculo_new" AS ENUM (
  'AGUARDANDO_GR', 'TRANSITO_CARREGAMENTO', 'LOCAL', 'MANIFESTADO',
  'FALTA_AGENDAR', 'AGENDADO', 'AGUARDANDO_DESCARGA', 'FINALIZADO'
);

ALTER TABLE "veiculos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "veiculos" ALTER COLUMN "status" TYPE "StatusVeiculo_new" USING (
  CASE "status"::text
    WHEN 'SOLICITADO' THEN 'AGUARDANDO_GR'
    WHEN 'FALTA_CONTRATAR' THEN 'AGUARDANDO_GR'
    WHEN 'LIBERADO' THEN 'AGUARDANDO_GR'
    WHEN 'AGUARDANDO_GR' THEN 'AGUARDANDO_GR'
    WHEN 'CANCELADO' THEN 'AGUARDANDO_GR'
    -- AGENDADO antigo era agendamento de carregamento (o novo é antes da descarga).
    WHEN 'AGENDADO' THEN 'TRANSITO_CARREGAMENTO'
    WHEN 'AGUARDANDO_CARREGAMENTO' THEN 'TRANSITO_CARREGAMENTO'
    WHEN 'CARREGADO' THEN 'LOCAL'
    WHEN 'AGUARDANDO_NFE' THEN 'LOCAL'
    WHEN 'EM_TRANSITO' THEN 'MANIFESTADO'
    WHEN 'FALTA_AGENDAR' THEN 'FALTA_AGENDAR'
    WHEN 'AGUARDANDO_DESCARGA' THEN 'AGUARDANDO_DESCARGA'
    WHEN 'FINALIZADO' THEN 'FINALIZADO'
    WHEN 'PIX_PAGO' THEN 'FINALIZADO'
    WHEN 'CARTA_FRETE' THEN 'FINALIZADO'
    ELSE 'AGUARDANDO_GR'
  END
)::"StatusVeiculo_new";
DROP TYPE "StatusVeiculo";
ALTER TYPE "StatusVeiculo_new" RENAME TO "StatusVeiculo";
ALTER TABLE "veiculos" ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_GR';

-- ─── Rastreamento: PENDENTE como padrão ───────────────────────────────────────
ALTER TYPE "StatusRastreamento" ADD VALUE 'PENDENTE' BEFORE 'RASTREADOR';
