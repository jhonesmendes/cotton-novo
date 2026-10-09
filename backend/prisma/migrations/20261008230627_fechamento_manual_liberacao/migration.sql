-- AlterTable
ALTER TABLE "liberacoes" ADD COLUMN     "fardos_pendentes_fechamento" INTEGER,
ADD COLUMN     "fechamento_manual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechamento_manual_em" TIMESTAMP(3),
ADD COLUMN     "fechamento_manual_por" TEXT,
ADD COLUMN     "motivo_fechamento" TEXT;
