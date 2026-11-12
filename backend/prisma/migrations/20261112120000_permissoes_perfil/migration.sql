-- Permissões editáveis por perfil × tela × ação (Configurações › Permissões).
-- Sem linha = vale o padrão do código (backend/src/services/permissoes.ts).
CREATE TABLE "permissoes_perfil" (
  "id" SERIAL NOT NULL,
  "perfil" TEXT NOT NULL,
  "tela" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "permitido" BOOLEAN NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permissoes_perfil_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissoes_perfil_perfil_tela_acao_key" ON "permissoes_perfil"("perfil", "tela", "acao");
