#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOY - Cotton Fibra Forte  |  Servidor Linux + MySQL
# ═══════════════════════════════════════════════════════════════════════════════
# Uso: bash deploy.sh
# Pré-requisitos no servidor:
#   - Node.js >= 18
#   - npm >= 9
#   - MySQL rodando com usuário 'cotton' e banco 'cotton_db'
#   - PM2  (npm install -g pm2)
#   - Nginx instalado e configurado com nginx.conf deste projeto

set -e  # Encerra imediatamente em caso de erro

# ─── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🚀  DEPLOY - Cotton Fibra Forte                       ║${NC}"
echo -e "${CYAN}║        Servidor Linux + MySQL + Nginx + PM2                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
NGINX_WEBROOT="/var/www/cotton"
PM2_APP_NAME="cotton-backend"

# ─── PASSO 1: Verificar pré-requisitos ───────────────────────────────────────
echo -e "${BLUE}[1/7]${NC} Verificando pré-requisitos..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}✗ Node.js não encontrado. Instale com: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install nodejs${NC}"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo -e "${RED}✗ npm não encontrado.${NC}"; exit 1; }
command -v pm2  >/dev/null 2>&1 || { echo -e "${YELLOW}⚠ PM2 não encontrado. Instalando...${NC}"; npm install -g pm2; }
command -v mysql >/dev/null 2>&1 || echo -e "${YELLOW}⚠ MySQL CLI não encontrado no PATH (não critico se o servidor MySQL está rodando)${NC}"

echo -e "${GREEN}✓ Node $(node -v) | npm $(npm -v)${NC}"
echo ""

# ─── PASSO 2: Verificar .env do backend ──────────────────────────────────────
echo -e "${BLUE}[2/7]${NC} Verificando configuração do backend (.env)..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo -e "${RED}✗ Arquivo backend/.env não encontrado!${NC}"
  echo "   Copie e configure: cp backend/.env.example backend/.env"
  exit 1
fi

if grep -q "localhost" "$BACKEND_DIR/.env" && ! grep -q "NODE_ENV=production" "$BACKEND_DIR/.env"; then
  echo -e "${YELLOW}⚠  Aviso: NODE_ENV não está definido como 'production' no .env${NC}"
fi

DB_URL=$(grep "^DATABASE_URL" "$BACKEND_DIR/.env" | cut -d'=' -f2- | tr -d '"')
if [ -z "$DB_URL" ]; then
  echo -e "${RED}✗ DATABASE_URL não encontrado no backend/.env${NC}"
  exit 1
fi
echo -e "${GREEN}✓ DATABASE_URL configurado${NC}"
echo ""

# ─── PASSO 3: Instalar dependências do backend ───────────────────────────────
echo -e "${BLUE}[3/7]${NC} Instalando dependências do backend..."
cd "$BACKEND_DIR"
npm ci --omit=dev 2>/dev/null || npm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

# ─── PASSO 4: Build do backend (TypeScript → JavaScript) ─────────────────────
echo -e "${BLUE}[4/7]${NC} Compilando TypeScript..."
npx tsc
echo -e "${GREEN}✓ Build concluído em backend/dist/${NC}"
echo ""

# ─── PASSO 5: Prisma — gerar client e aplicar migrations ─────────────────────
echo -e "${BLUE}[5/7]${NC} Configurando Prisma e banco de dados..."

npx prisma generate
echo -e "${GREEN}  ✓ Prisma Client gerado${NC}"

# Verificar se há pasta de migrations
if [ -d "$BACKEND_DIR/prisma/migrations" ]; then
  echo "   Aplicando migrations existentes..."
  npx prisma migrate deploy
  echo -e "${GREEN}  ✓ Migrations aplicadas${NC}"
else
  echo -e "${YELLOW}   Pasta migrations/ não encontrada. Usando 'db push' para criar tabelas...${NC}"
  echo "   (Recomendado: rode 'npx prisma migrate dev --name init' localmente e faça commit)"
  npx prisma db push --accept-data-loss
  echo -e "${GREEN}  ✓ Schema aplicado ao banco MySQL${NC}"
fi
echo ""

# ─── PASSO 6: Build do frontend ──────────────────────────────────────────────
echo -e "${BLUE}[6/7]${NC} Compilando frontend React..."
cd "$FRONTEND_DIR"
npm ci --omit=dev 2>/dev/null || npm install
npm run build
echo -e "${GREEN}✓ Frontend compilado em frontend/dist/${NC}"

# Copiar build para webroot do Nginx
echo "   Copiando para $NGINX_WEBROOT..."
mkdir -p "$NGINX_WEBROOT"
cp -r "$FRONTEND_DIR/dist/." "$NGINX_WEBROOT/"
echo -e "${GREEN}✓ Frontend publicado em $NGINX_WEBROOT${NC}"
echo ""

# ─── PASSO 7: Iniciar/Reiniciar com PM2 ──────────────────────────────────────
echo -e "${BLUE}[7/7]${NC} Gerenciando processo com PM2..."
cd "$SCRIPT_DIR"

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "   Reiniciando processo existente..."
  pm2 reload "$PM2_APP_NAME" --update-env
else
  echo "   Iniciando novo processo..."
  pm2 start ecosystem.config.js
fi

pm2 save
echo -e "${GREEN}✓ PM2 atualizado${NC}"
echo ""

# ─── Resumo ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅  DEPLOY CONCLUÍDO COM SUCESSO!                           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "🌐 Frontend: http://cotton.jhontisystem.com.br"
echo "🔗 Backend:  http://localhost:3001"
echo "❤️  Health:   http://cotton.jhontisystem.com.br/health"
echo ""
echo "👤 Login padrão:"
echo "   Email: admin@cottonfibraforte.com"
echo "   Senha: admin123"
echo ""
echo "📋 Comandos úteis:"
echo "   pm2 logs $PM2_APP_NAME        # Ver logs em tempo real"
echo "   pm2 status                    # Status dos processos"
echo "   pm2 restart $PM2_APP_NAME     # Reiniciar backend"
echo "   systemctl reload nginx        # Recarregar Nginx"
echo ""
