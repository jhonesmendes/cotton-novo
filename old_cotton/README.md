# 🌿 Cotton Fibra Forte — Sistema de Gestão de Cargas

Sistema web completo para gestão de cargas de pluma de algodão, com backend Node.js + TypeScript, banco de dados MySQL, frontend React (Vite) e proxy reverso Nginx.

---

## 📋 Índice

1. [Arquitetura do Sistema](#-arquitetura-do-sistema)
2. [Pré-requisitos da VM Linux](#-pré-requisitos-da-vm-linux)
3. [Passo 1 — Preparar a VM](#-passo-1--preparar-a-vm)
4. [Passo 2 — Instalar Node.js](#-passo-2--instalar-nodejs)
5. [Passo 3 — Instalar e Configurar MySQL](#-passo-3--instalar-e-configurar-mysql)
6. [Passo 4 — Instalar Redis](#-passo-4--instalar-redis)
7. [Passo 5 — Instalar Nginx](#-passo-5--instalar-nginx)
8. [Passo 6 — Instalar PM2](#-passo-6--instalar-pm2)
9. [Passo 7 — Transferir o Projeto para a VM](#-passo-7--transferir-o-projeto-para-a-vm)
10. [Passo 8 — Configurar Variáveis de Ambiente](#-passo-8--configurar-variáveis-de-ambiente)
11. [Passo 9 — Configurar o Banco de Dados](#-passo-9--configurar-o-banco-de-dados)
12. [Passo 10 — Executar o Deploy](#-passo-10--executar-o-deploy)
13. [Passo 11 — Configurar o Nginx](#-passo-11--configurar-o-nginx)
14. [Passo 12 — Autostart na Inicialização](#-passo-12--autostart-na-inicialização)
15. [Verificação Final](#-verificação-final)
16. [Comandos Úteis do Dia a Dia](#-comandos-úteis-do-dia-a-dia)
17. [Solução de Problemas](#-solução-de-problemas)
18. [Credenciais Padrão](#-credenciais-padrão)

---

## 🏗 Arquitetura do Sistema

```
┌──────────────────────────────────────────────────┐
│                   VM Linux (Ubuntu/Debian)         │
│                                                    │
│  ┌─────────────┐    ┌──────────────────────────┐  │
│  │   Nginx     │    │   PM2 (Process Manager)  │  │
│  │  Port: 80   │───▶│   Backend Node.js        │  │
│  │             │    │   Port: 3001             │  │
│  └──────┬──────┘    └──────────┬───────────────┘  │
│         │                      │                  │
│  /var/www/cotton         ┌─────▼──────┐           │
│  (React Build)           │   MySQL    │           │
│                          │  Port:3306 │           │
│                          └─────┬──────┘           │
│                          ┌─────▼──────┐           │
│                          │   Redis    │           │
│                          │  Port:6379 │           │
│                          └────────────┘           │
└──────────────────────────────────────────────────┘
```

| Serviço  | Tecnologia                              | Porta  |
|----------|-----------------------------------------|--------|
| Frontend | React 18 + Vite + TailwindCSS           | 80     |
| Backend  | Node.js 20 + Express + TypeScript       | 3001   |
| Banco    | MySQL 8.x + Prisma ORM                  | 3306   |
| Cache    | Redis 7.x                               | 6379   |
| Proxy    | Nginx (reverse proxy + static files)    | 80/443 |
| Process  | PM2 (keep-alive + logs)                 | —      |

---

## ✅ Pré-requisitos da VM

| Requisito     | Mínimo             | Recomendado        |
|---------------|--------------------|--------------------|
| **SO**        | Ubuntu 20.04 LTS   | Ubuntu 22.04 LTS   |
| **CPU**       | 1 vCPU             | 2 vCPU             |
| **RAM**       | 1 GB               | 2 GB               |
| **Disco**     | 10 GB              | 20 GB              |
| **Rede**      | IP fixo ou domínio | Domínio com DNS    |
| **Acesso**    | SSH com sudo       | SSH com chave      |

> ⚠️ **Todos os comandos abaixo devem ser executados na VM Linux via SSH**

---

## 🔧 Passo 1 — Preparar a VM

Atualize o sistema e instale ferramentas básicas:

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y \
  curl \
  git \
  wget \
  unzip \
  build-essential \
  software-properties-common \
  ca-certificates \
  gnupg \
  lsb-release
```

---

## 🟢 Passo 2 — Instalar Node.js

O projeto requer **Node.js >= 18** (recomendado: Node.js 20 LTS).

```bash
# Adicionar repositório NodeSource para Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js e npm
sudo apt install -y nodejs

# Verificar instalação
node -v    # deve exibir v20.x.x
npm -v     # deve exibir 10.x.x ou superior
```

---

## 🐬 Passo 3 — Instalar e Configurar MySQL

### 3.1 — Instalar o MySQL Server

```bash
sudo apt install -y mysql-server

# Iniciar e habilitar o serviço
sudo systemctl start mysql
sudo systemctl enable mysql

# Verificar status
sudo systemctl status mysql
```

### 3.2 — Proteger a instalação inicial

```bash
sudo mysql_secure_installation
```

Responda às perguntas:
- `Validate password component?` → **N** (ou Y se quiser política de senha)
- `Remove anonymous users?` → **Y**
- `Disallow root login remotely?` → **Y**
- `Remove test database?` → **Y**
- `Reload privilege tables?` → **Y**

### 3.3 — Criar banco de dados e usuário

Execute o script de setup incluído no projeto **OU** faça manualmente:

```bash
# Opção A — usar o script automático (dentro da pasta do projeto)
sudo bash setup-server-mysql.sh

# Opção B — manual
sudo mysql -u root -p
```

```sql
-- Dentro do MySQL:
CREATE DATABASE IF NOT EXISTS cotton_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cotton'@'localhost' IDENTIFIED BY 'mudar@8956';
GRANT ALL PRIVILEGES ON cotton_db.* TO 'cotton'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.4 — Verificar conexão

```bash
mysql -u cotton -p'mudar@8956' -e "USE cotton_db; SELECT 'Conexão OK';"
```

> 💡 A `DATABASE_URL` para o `.env` é: `mysql://cotton:mudar%408956@localhost:3306/cotton_db`
> (note o `%40` que representa o `@` na senha, obrigatório na URL)

---

## 🔴 Passo 4 — Instalar Redis

O backend usa Redis para cache de sessões.

```bash
sudo apt install -y redis-server

# Configurar para iniciar automaticamente
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar
redis-cli ping    # deve retornar: PONG
```

---

## 🌐 Passo 5 — Instalar Nginx

```bash
sudo apt install -y nginx

# Iniciar e habilitar
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar
sudo systemctl status nginx
```

---

## ⚙️ Passo 6 — Instalar PM2

PM2 é o gerenciador de processos que mantém o backend rodando em segundo plano.

```bash
# Instalar globalmente via npm
sudo npm install -g pm2

# Verificar
pm2 -v
```

---

## 📁 Passo 7 — Transferir o Projeto para a VM

### Opção A — Via Git (recomendado)

```bash
# Na VM, escolha um diretório para o projeto
cd /opt

sudo mkdir cotton
sudo chown $USER:$USER cotton
cd cotton

# Clonar o repositório
git clone <URL_DO_REPOSITÓRIO> .
```

### Opção B — Via SCP (transferência direta do Windows)

No **Windows**, abra o PowerShell e execute:

```powershell
# Compactar o projeto (excluindo node_modules)
# Primeiro, instale o 7-zip ou use o Compress-Archive do PowerShell

Compress-Archive -Path "C:\Users\jhonesmendes\Desktop\cotton\cotton\*" `
  -DestinationPath "C:\Users\jhonesmendes\Desktop\cotton_deploy.zip" `
  -Force

# Enviar para a VM (substitua USER e IP_DA_VM)
scp C:\Users\jhonesmendes\Desktop\cotton_deploy.zip USER@IP_DA_VM:/opt/cotton/
```

Na **VM Linux**:

```bash
cd /opt/cotton
unzip cotton_deploy.zip

# Remover os node_modules enviados (serão reinstalados)
rm -rf node_modules backend/node_modules frontend/node_modules
```

### Opção C — Via rsync (mais eficiente)

```bash
# No Windows com WSL ou Git Bash:
rsync -avz --exclude='node_modules' --exclude='.git' \
  /mnt/c/Users/jhonesmendes/Desktop/cotton/cotton/ \
  USER@IP_DA_VM:/opt/cotton/
```

---

## 🔑 Passo 8 — Configurar Variáveis de Ambiente

### 8.1 — Backend (.env)

```bash
cd /opt/cotton/backend

# Criar o .env a partir do exemplo
cp .env.example .env

# Editar com as configurações de produção
nano .env
```

Preencha o arquivo `.env` com os seguintes valores:

```env
# ── Banco de Dados ────────────────────────────────────────────────────────────
DATABASE_URL="mysql://cotton:mudar%408956@localhost:3306/cotton_db"

# ── Autenticação JWT ──────────────────────────────────────────────────────────
JWT_SECRET="cotton-fibra-forte-chave-secreta-2026-super-segura-prod"
JWT_EXPIRES_IN="8h"
JWT_REFRESH_EXPIRES_IN="7d"

# ── Servidor ──────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV="production"

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── CORS ──────────────────────────────────────────────────────────────────────
# Use o IP ou domínio da sua VM
FRONTEND_URL="http://SEU_DOMINIO_OU_IP"

# ── Criptografia ──────────────────────────────────────────────────────────────
ENCRYPTION_KEY="cotton-fibra-forte-encryption-key-32-chars-2026"
```

> ⚠️ **IMPORTANTE**: Troque `JWT_SECRET` e `ENCRYPTION_KEY` por valores únicos e seguros em produção!

### 8.2 — Frontend (.env.production)

```bash
cd /opt/cotton/frontend
nano .env.production
```

Ajuste a URL da API para o domínio ou IP da sua VM:

```env
VITE_API_URL=http://SEU_DOMINIO_OU_IP/api
```

### 8.3 — PM2 (ecosystem.config.js)

Se necessário, edite o arquivo `ecosystem.config.js` na raiz do projeto para ajustar as variáveis de `env_production`:

```bash
cd /opt/cotton
nano ecosystem.config.js
```

Atualize o `FRONTEND_URL` e `CORS_ORIGIN` com o endereço real da VM.

---

## 🗄️ Passo 9 — Configurar o Banco de Dados

```bash
cd /opt/cotton/backend

# Instalar dependências do backend (incluindo Prisma)
npm install

# Gerar o Prisma Client
npx prisma generate

# Aplicar o schema ao banco MySQL
# Se não há pasta migrations/, use db push:
npx prisma db push

# OU se há migrations/ criadas localmente:
npx prisma migrate deploy
```

### 9.1 — (Opcional) Popular com dados iniciais

```bash
# Se houver arquivo seed
node run-seed.js

# OU executar o SQL diretamente
mysql -u cotton -p'mudar@8956' cotton_db < seed.sql
```

---

## 🚀 Passo 10 — Executar o Deploy

O projeto inclui um script de deploy automatizado que faz tudo em sequência:

```bash
cd /opt/cotton

# Dar permissão de execução ao script
chmod +x deploy.sh

# Executar o deploy
bash deploy.sh
```

O script realiza automaticamente:
1. ✅ Verifica pré-requisitos (Node, npm, PM2, MySQL)
2. ✅ Valida o arquivo `.env` do backend
3. ✅ Instala dependências do backend
4. ✅ Compila TypeScript → JavaScript (`backend/dist/`)
5. ✅ Gera Prisma Client e aplica migrations
6. ✅ Compila o frontend React (`frontend/dist/`)
7. ✅ Copia o build para `/var/www/cotton`
8. ✅ Inicia/reinicia o backend com PM2

### Deploy manual (passo a passo)

Caso prefira fazer manualmente:

```bash
# 1. Compilar o Backend
cd /opt/cotton/backend
npm ci --omit=dev
npx tsc
npx prisma generate
npx prisma migrate deploy    # ou: npx prisma db push

# 2. Compilar o Frontend
cd /opt/cotton/frontend
npm ci --omit=dev
npm run build

# 3. Publicar o Frontend
sudo mkdir -p /var/www/cotton
sudo cp -r dist/. /var/www/cotton/
sudo chown -R www-data:www-data /var/www/cotton

# 4. Iniciar o Backend com PM2
cd /opt/cotton
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 🌐 Passo 11 — Configurar o Nginx

### 11.1 — Criar pasta de logs

```bash
sudo mkdir -p /var/log/cotton
sudo mkdir -p /var/log/nginx
```

### 11.2 — Copiar e ativar a configuração

```bash
# Copiar o arquivo de configuração do Nginx
sudo cp /opt/cotton/nginx.conf /etc/nginx/sites-available/cotton

# Editar se necessário (ajustar server_name com seu IP/domínio)
sudo nano /etc/nginx/sites-available/cotton
```

Certifique-se que a linha `server_name` corresponde ao seu IP ou domínio:
```nginx
server_name SEU_DOMINIO_OU_IP;
```

```bash
# Criar link simbólico para ativar o site
sudo ln -s /etc/nginx/sites-available/cotton /etc/nginx/sites-enabled/cotton

# Remover o site padrão do Nginx (opcional)
sudo rm -f /etc/nginx/sites-enabled/default

# Testar a configuração
sudo nginx -t

# Recarregar o Nginx
sudo systemctl reload nginx
```

### 11.3 — Permissões do webroot

```bash
sudo chown -R www-data:www-data /var/www/cotton
sudo chmod -R 755 /var/www/cotton
```

---

## 🔄 Passo 12 — Autostart na Inicialização

Configure o PM2 para iniciar automaticamente após reboot da VM:

```bash
# Gerar script de startup para o sistema
pm2 startup

# ⚠️ O comando acima irá exibir um comando sudo para copiar e executar.
# Exemplo de output:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Execute o comando exibido acima (vai variar conforme seu usuário)

# Salvar a lista de processos atual
pm2 save
```

---

## ✅ Verificação Final

Após todos os passos, verifique se tudo está funcionando:

```bash
# 1. Status do PM2
pm2 status

# Resultado esperado:
# ┌─────────────────┬────┬──────┬───────┬────────┬─────────┐
# │ name            │ id │ mode │ pid   │ status │ cpu/mem │
# ├─────────────────┼────┼──────┼───────┼────────┼─────────┤
# │ cotton-backend  │ 0  │ fork │ XXXXX │ online │ ...     │
# └─────────────────┴────┴──────┴───────┴────────┴─────────┘

# 2. Testar o backend diretamente
curl http://localhost:3001/health

# 3. Testar via Nginx
curl http://SEU_IP_OU_DOMINIO/health

# 4. Status dos serviços
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status redis-server

# 5. Ver logs do backend em tempo real
pm2 logs cotton-backend
```

---

## 🛠 Comandos Úteis do Dia a Dia

### PM2 (Backend)

```bash
pm2 status                          # Ver status de todos os processos
pm2 logs cotton-backend             # Logs em tempo real
pm2 logs cotton-backend --lines 100 # Últimas 100 linhas de log
pm2 restart cotton-backend          # Reiniciar o backend
pm2 reload cotton-backend           # Reload sem downtime (graceful)
pm2 stop cotton-backend             # Parar o backend
pm2 monit                           # Monitor interativo com CPU/RAM
```

### Nginx

```bash
sudo nginx -t                       # Testar configuração
sudo systemctl reload nginx         # Recarregar sem downtime
sudo systemctl restart nginx        # Reiniciar completamente
sudo tail -f /var/log/nginx/cotton-error.log    # Logs de erro
sudo tail -f /var/log/nginx/cotton-access.log   # Logs de acesso
```

### MySQL

```bash
sudo systemctl status mysql
mysql -u cotton -p'mudar@8956' cotton_db   # Acessar o banco
```

### Redis

```bash
redis-cli ping                      # Verificar se está ativo
redis-cli info                      # Informações do Redis
```

### Atualizar o sistema (novo deploy)

```bash
cd /opt/cotton
git pull origin main                # Baixar atualizações (se usar Git)
bash deploy.sh                      # Executar o deploy novamente
```

---

## 🔥 Solução de Problemas

### Backend não inicia

```bash
# Ver logs detalhados
pm2 logs cotton-backend --err

# Verificar se a porta 3001 está em uso
sudo lsof -i :3001

# Testar o backend manualmente
cd /opt/cotton/backend
node dist/app.js
```

### Erro de conexão com MySQL

```bash
# Verificar se o MySQL está rodando
sudo systemctl status mysql

# Testar conexão com as credenciais
mysql -u cotton -p'mudar@8956' cotton_db

# Verificar o DATABASE_URL no .env
cat /opt/cotton/backend/.env | grep DATABASE_URL
```

### Erro 502 Bad Gateway no Nginx

O Nginx não consegue alcançar o backend na porta 3001:

```bash
# Verificar se o backend está rodando
pm2 status
curl http://localhost:3001/health

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/cotton-error.log
```

### Frontend mostra tela em branco

```bash
# Verificar se os arquivos estão no webroot
ls -la /var/www/cotton/

# Verificar permissões
sudo chown -R www-data:www-data /var/www/cotton

# Verificar se o Nginx está servindo o diretório certo
grep -n "root" /etc/nginx/sites-available/cotton
```

### Prisma / Banco de dados: erro de migration

```bash
cd /opt/cotton/backend

# Verificar estado das migrations
npx prisma migrate status

# Forçar sincronização do schema (cuidado: pode perder dados em produção)
npx prisma db push --force-reset

# Recriar o banco completamente
mysql -u root -p -e "DROP DATABASE cotton_db; CREATE DATABASE cotton_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npx prisma db push
```

### Verificar uso de memória e processos

```bash
# Uso de memória
free -h

# Processos em execução
pm2 monit

# Uso de disco
df -h
```

---

## 🔐 Credenciais Padrão

> ⚠️ **Troque todas as senhas abaixo imediatamente após o primeiro acesso!**

| Serviço            | Usuário / Campo    | Valor Padrão                          |
|--------------------|--------------------|---------------------------------------|
| App (login web)    | admin@cottonfibraforte.com | `admin123`                 |
| MySQL — usuário    | `cotton`           | `mudar@8956`                          |
| JWT Secret         | `JWT_SECRET`       | (definido no `.env`)                  |
| Encryption Key     | `ENCRYPTION_KEY`   | (definido no `.env`)                  |

---

## 📦 Resumo de Tecnologias

| Camada     | Tecnologia                 | Versão   |
|------------|----------------------------|----------|
| Runtime    | Node.js                    | >= 20 LTS|
| Backend    | Express + TypeScript       | 4.x / 5.x|
| ORM        | Prisma                     | 5.x      |
| Banco      | MySQL                      | 8.x      |
| Cache      | Redis                      | 7.x      |
| Frontend   | React + Vite + TailwindCSS | 18 / 5.x |
| Proxy      | Nginx                      | 1.x      |
| Process    | PM2                        | 5.x      |

---

## 📞 Suporte

- **Logs backend**: `pm2 logs cotton-backend`
- **Logs Nginx**: `/var/log/nginx/cotton-error.log`
- **Logs PM2**: `~/.pm2/logs/`

---

*Documentação gerada para Cotton Fibra Forte — Sistema de Gestão de Cargas de Pluma de Algodão.*
