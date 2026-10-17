-- AlterTable
ALTER TABLE "liberacoes" ADD COLUMN     "local_entrega_id" INTEGER,
ADD COLUMN     "local_entrega_nome" TEXT;

-- CreateTable
CREATE TABLE "locais_entrega" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locais_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locais_entrega_nome_key" ON "locais_entrega"("nome");

-- AddForeignKey
ALTER TABLE "liberacoes" ADD CONSTRAINT "liberacoes_local_entrega_id_fkey" FOREIGN KEY ("local_entrega_id") REFERENCES "locais_entrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;
