-- AlterTable
ALTER TABLE "liberacoes" ADD COLUMN     "concluida_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "finalizado_em" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "liberacoes_concluida_em_idx" ON "liberacoes"("concluida_em");

-- CreateIndex
CREATE INDEX "veiculos_finalizado_em_idx" ON "veiculos"("finalizado_em");

-- Preenche o histórico com a melhor data disponível.
-- Liberações concluídas: data em que a auditoria registrou a passagem para
-- CONCLUIDA; sem auditoria (antes de out/2026), a última finalização/atualização
-- dos veículos; por último, a última atualização da própria liberação.
UPDATE "liberacoes" l
SET "concluida_em" = COALESCE(
  (SELECT MAX(a."created_at") FROM "auditoria_log" a
    WHERE a."tabela_afetada" = 'Liberacao' AND a."registro_id" = l."id"
      AND a."dados_novos" LIKE '%"status":"CONCLUIDA"%'),
  (SELECT MAX(COALESCE(v."data_descarga", v."updated_at")) FROM "veiculos" v WHERE v."liberacao_id" = l."id"),
  l."updated_at"
)
WHERE l."status" = 'CONCLUIDA' AND l."concluida_em" IS NULL;

-- Veículos finalizados: auditoria da passagem para FINALIZADO; senão a data de
-- descarga; senão a última atualização do veículo.
UPDATE "veiculos" v
SET "finalizado_em" = COALESCE(
  (SELECT MAX(a."created_at") FROM "auditoria_log" a
    WHERE a."tabela_afetada" = 'Veiculo' AND a."registro_id" = v."id"
      AND a."dados_novos" LIKE '%"status":"FINALIZADO"%'),
  v."data_descarga",
  v."updated_at"
)
WHERE v."status" = 'FINALIZADO' AND v."finalizado_em" IS NULL;
