# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE MIGRAÇÃO RÁPIDA - Cotton para MySQL (Windows/PowerShell)
# ═══════════════════════════════════════════════════════════════════════════════
# Execute: powershell -ExecutionPolicy Bypass -File migrate-mysql.ps1

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║                    MIGRAÇÃO - SQLite → MySQL                              ║" -ForegroundColor White
Write-Host "║                     Cotton Fibra Forte Backend                             ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

# Verificar se está na pasta backend
if (-not (Test-Path "package.json")) {
    Write-Host "✗ Erro: Execute este script dentro da pasta backend\" -ForegroundColor Red
    Write-Host "   cd backend; powershell -ExecutionPolicy Bypass -File migrate-mysql.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "[1/6] Verificando dependências..." -ForegroundColor Blue
Write-Host "✓ PowerShell verificado" -ForegroundColor Green
Write-Host ""

# PASSO 1: Instalar pacotes npm
Write-Host "[2/6] Instalando dependências npm..." -ForegroundColor Blue
npm install
Write-Host "✓ Dependências npm instaladas" -ForegroundColor Green
Write-Host ""

# PASSO 2: Gerar Prisma
Write-Host "[3/6] Gerando cliente Prisma para MySQL..." -ForegroundColor Blue
npm run generate
Write-Host "✓ Cliente Prisma gerado" -ForegroundColor Green
Write-Host ""

# PASSO 3: Verificar .env
Write-Host "[4/6] Verificando configuração..." -ForegroundColor Blue
if (Test-Path ".env" -and (Select-String -Path ".env" -Pattern "DATABASE_URL" -Quiet)) {
    Write-Host "✓ DATABASE_URL configurado" -ForegroundColor Green
} else {
    Write-Host "✗ DATABASE_URL não encontrado em .env" -ForegroundColor Red
    Write-Host "   Adicione: DATABASE_URL=`"mysql://root:@localhost:3306/cotton_db`"" -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASSO 4: Tentar criar banco via MySQL CLI
Write-Host "[5/6] Criando banco de dados MySQL..." -ForegroundColor Blue

# Verificar se mysql está no PATH
$mysqlPath = (Get-Command mysql -ErrorAction SilentlyContinue).Path
if ($mysqlPath) {
    try {
        mysql -u root < setup-mysql.sql 2>$null
        Write-Host "✓ Banco de dados criado/atualizado" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Não foi possível executar SQL automaticamente" -ForegroundColor Yellow
        Write-Host "   Execute manualmente via phpMyAdmin (veja passo 6)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ MySQL CLI não encontrado, setup manual necessário" -ForegroundColor Yellow
    Write-Host "   Execute via phpMyAdmin (veja passo 6)" -ForegroundColor Yellow
}
Write-Host ""

# PASSO 5: Instruções finais
Write-Host "[6/6] Instruções finais..." -ForegroundColor Blue
Write-Host ""
Write-Host "Se o banco não foi criado automaticamente, execute via phpMyAdmin:" -ForegroundColor Yellow
Write-Host "   1. Abra: http://localhost/phpmyadmin" -ForegroundColor Yellow
Write-Host "   2. Clique em 'SQL' no topo" -ForegroundColor Yellow
Write-Host "   3. Copie TODO o conteúdo de: backend\setup-mysql.sql" -ForegroundColor Yellow
Write-Host "   4. Cole no editor SQL do phpMyAdmin" -ForegroundColor Yellow
Write-Host "   5. Clique em 'Executar'" -ForegroundColor Yellow
Write-Host ""

# SUCESSO
Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    ✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO!                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Inicie MySQL no XAMPP (painel de controle)" -ForegroundColor Cyan
Write-Host "   2. Execute: npm run dev" -ForegroundColor Cyan
Write-Host "   3. Seu backend está pronto em http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "👤 Login padrão:" -ForegroundColor Cyan
Write-Host "   Email: admin@cottonfibra.com.br" -ForegroundColor Cyan
Write-Host "   Senha: admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentação: veja MYSQL_SETUP.md para mais detalhes" -ForegroundColor Cyan
Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════════════════════" -ForegroundColor Gray
