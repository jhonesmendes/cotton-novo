-- Fase 2 (nov/2026): campos do Informe (ordem do caminhão) no veículo.
ALTER TABLE "veiculos"
  ADD COLUMN "comprimento" TEXT,
  ADD COLUMN "altura" DOUBLE PRECISION,
  ADD COLUMN "captacao" TEXT,
  ADD COLUMN "cadastrado_por" TEXT;

-- Quem lançou cada veículo já existente, tirado da auditoria (criação do registro).
UPDATE "veiculos" v SET "cadastrado_por" = u."nome"
FROM "auditoria_log" a
JOIN "usuarios" u ON u."id" = a."usuario_id"
WHERE a."tabela_afetada" = 'Veiculo' AND a."acao" = 'INSERT' AND a."registro_id" = v."id";
