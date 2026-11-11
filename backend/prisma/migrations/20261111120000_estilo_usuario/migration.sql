-- Estilo visual do painel por usuário (Minha conta).
ALTER TABLE "usuarios" ADD COLUMN "estilo" TEXT NOT NULL DEFAULT 'CLASSICO';
