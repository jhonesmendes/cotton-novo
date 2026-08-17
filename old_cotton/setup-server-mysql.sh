#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# setup-server-mysql.sh
# Cria o usuário 'cotton' e o banco 'cotton_db' no MySQL do servidor Linux
# ═══════════════════════════════════════════════════════════════════════════════
# Execute como root ou usuário com acesso ao MySQL:
#   sudo bash setup-server-mysql.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

MYSQL_ROOT_PASS="${1:-}"  # Passe a senha root como argumento, ou deixe vazio

echo ""
echo "════════════════════════════════════════════════════"
echo "  Setup MySQL — Cotton Fibra Forte"
echo "  Banco: cotton_db  |  Usuário: cotton"
echo "════════════════════════════════════════════════════"
echo ""

if [ -z "$MYSQL_ROOT_PASS" ]; then
    echo "Informe a senha root do MySQL:"
    read -s -p "Senha root MySQL: " MYSQL_ROOT_PASS
    echo ""
fi

MYSQL_CMD="mysql -u root -p${MYSQL_ROOT_PASS}"

echo "[1/3] Criando banco de dados 'cotton_db'..."
$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS cotton_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
EOF
echo "  ✓ Banco criado"

echo "[2/3] Criando usuário 'cotton' e concedendo permissões..."
$MYSQL_CMD <<EOF
CREATE USER IF NOT EXISTS 'cotton'@'localhost' IDENTIFIED BY 'mudar@8956';
GRANT ALL PRIVILEGES ON cotton_db.* TO 'cotton'@'localhost';
FLUSH PRIVILEGES;
EOF
echo "  ✓ Usuário criado com permissões"

echo "[3/3] Verificando acesso..."
mysql -u cotton -p'mudar@8956' -e "USE cotton_db; SELECT 'Conexão OK' AS status;" 2>/dev/null && \
  echo "  ✓ Usuário 'cotton' consegue acessar 'cotton_db'" || \
  echo "  ⚠ Verifique manualmente: mysql -u cotton -p'mudar@8956' cotton_db"

echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅  Setup MySQL concluído!"
echo ""
echo "  DATABASE_URL para o .env:"
echo "  mysql://cotton:mudar%408956@localhost:3306/cotton_db"
echo "════════════════════════════════════════════════════"
echo ""
echo "  Próximo passo: bash deploy.sh"
echo ""
