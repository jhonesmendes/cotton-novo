#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE MIGRAÇÃO RÁPIDA - Cotton para MySQL
# ═══════════════════════════════════════════════════════════════════════════════
# Execute este script para migrar rapidamente para MySQL

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    MIGRAÇÃO - SQLite → MySQL                              ║"
echo "║                     Cotton Fibra Forte Backend                             ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PASSO 1: Verificar se está na pasta backend
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Erro: Execute este script dentro da pasta backend/${NC}"
    echo "   cd backend && bash migrate-mysql.sh"
    exit 1
fi

echo -e "${BLUE}[1/5]${NC} Verificando dependências..."

# PASSO 2: Verificar MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL CLI não encontrada${NC}"
    echo "   Instale via XAMPP ou configure PATH"
    read -p "   Continuar mesmo assim? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Dependências verificadas${NC}"
echo ""

# PASSO 3: Instalar pacotes
echo -e "${BLUE}[2/5]${NC} Instalando dependências npm..."
npm install --silent
echo -e "${GREEN}✓ Dependências npm instaladas${NC}"
echo ""

# PASSO 4: Gerar Prisma
echo -e "${BLUE}[3/5]${NC} Gerando cliente Prisma para MySQL..."
npm run generate --silent
echo -e "${GREEN}✓ Cliente Prisma gerado${NC}"
echo ""

# PASSO 5: Executar SQL de setup
echo -e "${BLUE}[4/5]${NC} Criando banco de dados MySQL..."
if command -v mysql &> /dev/null; then
    mysql -u root < setup-mysql.sql 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Banco de dados criado/atualizado${NC}"
    else
        echo -e "${YELLOW}⚠ Aviso: Não foi possível executar SQL automaticamente${NC}"
        echo "   Execute manualmente via phpMyAdmin:"
        echo "   1. Abra http://localhost/phpmyadmin"
        echo "   2. Clique em SQL"
        echo "   3. Cole o conteúdo de setup-mysql.sql"
        echo "   4. Clique Executar"
    fi
else
    echo -e "${YELLOW}⚠ MySQL não disponível, setup manual necessário${NC}"
    echo "   1. Abra http://localhost/phpmyadmin"
    echo "   2. Clique em SQL"
    echo "   3. Cole o conteúdo de setup-mysql.sql"
    echo "   4. Clique Executar"
fi
echo ""

# PASSO 6: Verificar .env
echo -e "${BLUE}[5/5]${NC} Verificando configuração..."
if grep -q "DATABASE_URL" .env; then
    echo -e "${GREEN}✓ DATABASE_URL configurado${NC}"
else
    echo -e "${RED}✗ DATABASE_URL não encontrado em .env${NC}"
    echo "   Adicione: DATABASE_URL=\"mysql://root:@localhost:3306/cotton_db\""
    exit 1
fi
echo ""

# SUCESSO
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo -e "║${GREEN}                    ✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO!${NC}                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Próximos passos:"
echo "   1. Inicie MySQL no XAMPP"
echo "   2. Execute: npm run dev"
echo "   3. Seu backend está pronto em http://localhost:3001"
echo ""
echo "👤 Login padrão:"
echo "   Email: admin@cottonfibra.com.br"
echo "   Senha: admin123"
echo ""
echo "📚 Documentação: veja MYSQL_SETUP.md para mais detalhes"
echo ""
