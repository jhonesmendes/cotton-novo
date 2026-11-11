-- Parte 2 (separada porque o valor novo de enum só pode ser usado depois do commit
-- do ALTER TYPE ... ADD VALUE da migration anterior).

ALTER TABLE "veiculos" ALTER COLUMN "status_rastreamento" SET DEFAULT 'PENDENTE';

-- NAO_RASTREADO era só o padrão antigo, não uma resposta: nas liberações ainda
-- abertas volta a ser PENDENTE para alguém informar. Concluídas não mudam.
UPDATE "veiculos" v SET "status_rastreamento" = 'PENDENTE'
FROM "liberacoes" l
WHERE l."id" = v."liberacao_id" AND l."status" = 'ATIVA' AND v."status_rastreamento" = 'NAO_RASTREADO';

-- Peso carregado: o campo era em toneladas, mas houve digitação em kg (ex.: 35760).
-- Nenhum caminhão carrega mais de 100 t — acima disso é kg.
UPDATE "veiculos" SET "peso_carregado" = "peso_carregado" / 1000 WHERE "peso_carregado" > 100;

-- Carregado passa a ser só o que já foi carregado (veículos ativos a partir de
-- MANIFESTADO). Concluídas ficam como estão.
UPDATE "liberacoes" l SET "carregado" = COALESCE((
  SELECT SUM(v."qtd_fardos") FROM "veiculos" v
  WHERE v."liberacao_id" = l."id" AND v."ativo"
    AND v."status" IN ('MANIFESTADO', 'FALTA_AGENDAR', 'AGENDADO', 'AGUARDANDO_DESCARGA', 'FINALIZADO')
), 0)
WHERE l."status" <> 'CONCLUIDA';

-- ─── Parâmetros do sistema ────────────────────────────────────────────────────
CREATE TABLE "configuracoes_sistema" (
  "id" SERIAL NOT NULL,
  "chave" TEXT NOT NULL,
  "valor" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "configuracoes_sistema_chave_key" ON "configuracoes_sistema"("chave");

-- Tolerância (%) entre a soma dos pesos dos veículos e o peso da instrução no fechamento.
INSERT INTO "configuracoes_sistema" ("chave", "valor") VALUES ('tolerancia_peso_fechamento', '1');

-- Opções iniciais de forma de pagamento (editáveis em Revisão de Dados).
INSERT INTO "referencias_cadastro" ("tipo", "valor", "updated_at") VALUES
  ('formasPagamento', 'Depósito', CURRENT_TIMESTAMP),
  ('formasPagamento', 'Carta frete', CURRENT_TIMESTAMP),
  ('formasPagamento', 'PIX', CURRENT_TIMESTAMP),
  ('formasPagamento', 'Adiantamento + saldo', CURRENT_TIMESTAMP)
ON CONFLICT ("tipo", "valor") DO NOTHING;

-- O Prisma preenche updated_at sozinho (@updatedAt); o default só serviu para os INSERTs acima.
ALTER TABLE "configuracoes_sistema" ALTER COLUMN "updated_at" DROP DEFAULT;
