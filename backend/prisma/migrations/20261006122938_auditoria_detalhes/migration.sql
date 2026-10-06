-- AlterTable
ALTER TABLE "auditoria_log" ADD COLUMN     "campos_alterados" TEXT,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "liberacao_id" INTEGER,
ADD COLUMN     "rota" TEXT;

-- CreateIndex
CREATE INDEX "auditoria_log_tabela_afetada_registro_id_idx" ON "auditoria_log"("tabela_afetada", "registro_id");

-- CreateIndex
CREATE INDEX "auditoria_log_liberacao_id_idx" ON "auditoria_log"("liberacao_id");

-- CreateIndex
CREATE INDEX "auditoria_log_usuario_id_idx" ON "auditoria_log"("usuario_id");
