-- Tema por usuário (Minha conta): paleta VERDE/AZUL e modo CLARO/ESCURO.
ALTER TABLE "usuarios" ADD COLUMN "tema" TEXT NOT NULL DEFAULT 'AZUL', ADD COLUMN "modo" TEXT;
