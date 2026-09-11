-- CreateEnum
CREATE TYPE "StatusSM" AS ENUM ('PENDENTE', 'ABERTA', 'LIBERADA', 'ENCERRADA');

-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "status_sm" "StatusSM" NOT NULL DEFAULT 'PENDENTE';
