-- CreateEnum
CREATE TYPE "StatusRastreamento" AS ENUM ('RASTREADOR', 'LOCALIZADO', 'APLICATIVO', 'NAO_RASTREADO');

-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "numero_isca" TEXT,
ADD COLUMN     "status_rastreamento" "StatusRastreamento" NOT NULL DEFAULT 'NAO_RASTREADO';
