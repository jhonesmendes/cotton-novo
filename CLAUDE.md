# Cotton — Sistema de Gestão de Cargas de Pluma de Algodão

Sistema interno da **Cotton Fibra Forte** para controlar o ciclo de vida de cargas
(fardão/fardinho de algodão) desde a solicitação até a entrega, com monitoramento de
prazos (deadlines) e alertas.

## Stack

- **Backend**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL. Auth via JWT
  (`jsonwebtoken` + `bcryptjs`), validação com `zod`.
- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, React Router, React Query
  (`@tanstack/react-query`), React Hook Form + Zod, Zustand para estado global, Recharts
  para gráficos.
- Monorepo simples (sem workspaces): `backend/` e `frontend/` são projetos npm
  independentes.
- **Execução local é via Docker Compose** (ver seção abaixo) — não depende mais de XAMPP.

## Docker Compose (forma padrão de rodar o projeto)

```
docker compose up --build          # sobe postgres + adminer + backend + frontend (dev, hot-reload)
docker compose down                # derruba tudo (mantém o volume do postgres)
docker compose logs -f backend     # segue os logs de um serviço
docker compose exec backend sh     # shell dentro do container do backend

# produção (build de imagens otimizadas, sem hot-reload/adminer, arquivo autossuficiente)
docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` é independente do `docker-compose.yml` de dev (não usa `-f` duplo)
de propósito — o Portainer só aceita um arquivo no campo "Compose path" ao fazer deploy via
repositório Git.

Também há atalhos no `package.json` da raiz: `npm run docker:up`, `docker:down`,
`docker:prod`, `docker:logs`.

- **Portas**: frontend `5173`, backend `3001`, PostgreSQL `5432`, Adminer `8080`
  (sistema: PostgreSQL, servidor: `postgres`, usuário/senha do `.env` da raiz).
- **Config**: variáveis do compose vêm do `.env` da raiz (copiado de `.env.example`,
  já existe um `.env` com defaults de dev). Em produção, defina `JWT_SECRET`,
  `ENCRYPTION_KEY` e `FRONTEND_URL` reais antes de subir.
- **Migrations**: o container do backend roda `prisma migrate deploy` automaticamente
  no start. Para criar uma nova migration em dev, edite `backend/prisma/schema.prisma` e
  rode `docker compose exec backend npx prisma migrate dev --name <nome>` — isso grava
  os arquivos em `backend/prisma/migrations/`, que é bind-mount e **deve ser commitado**.
- Hot-reload: `backend/src` e `frontend/src` são bind mounts — editar local reflete no
  container na hora (ts-node-dev / vite).
- **Sem Docker** (fallback manual, não é o caminho suportado por padrão): precisaria de
  um PostgreSQL rodando à parte e `backend/.env` preenchido a partir do
  `backend/.env.example`; depois `npm --prefix backend run dev` e
  `npm --prefix frontend run dev`.

## Comandos npm (dentro dos containers, ou localmente se não usar Docker)

```
# backend/
npm run build         # tsc
npm run lint          # eslint src/
npm run migrate       # prisma migrate dev
npm run migrate:prod  # prisma migrate deploy
npm run generate      # prisma generate
npm run seed          # ts-node prisma/seed.ts

# frontend/
npm run build         # tsc && vite build
npm run lint          # eslint src/
```

## Estrutura

- `backend/src/controllers` + `backend/src/routes` — um par por módulo (auth, clientes,
  destinos, liberacoes, alertas, dashboard, usuarios, veiculos, terminais, origens,
  modelos, locais-coleta).
- `backend/src/middleware` — `auth.ts` (JWT) e `errorHandler.ts`.
- `backend/prisma/schema.prisma` — schema fonte da verdade do domínio.
- `frontend/src/pages` — uma pasta por área (Dashboard, Liberacoes, Alertas, Cadastros,
  Usuarios) + `Login.tsx`.
- `frontend/src/services/api.ts` — client axios central.
- `frontend/src/stores/auth.store.ts` — sessão/autenticação (zustand).

## Domínio — fluxo de status de carga (`StatusVeiculo`)

```
SOLICITADO → FALTA_CONTRATAR → FALTA_AGENDAR → AGENDADO
    → LIBERADO  [inicia monitoramento de deadline]
    → AGUARDANDO_NFE / AGUARDANDO_GR (paralelo)
    → AGUARDANDO_CARREGAMENTO → CARREGADO → EM_TRANSITO
    → AGUARDANDO_DESCARGA → FINALIZADO  [para monitoramento]
```

- Monitoramento de deadline liga ao entrar em qualquer status de `LIBERADO` até
  `AGUARDANDO_DESCARGA`, e desliga em `FINALIZADO` (ver `monitor.md` na raiz).
- Outros enums relevantes do domínio: `TipoFardo` (FARDAO/FARDINHO), `TipoAlerta`,
  `StatusAlerta`, `PerfilUsuario` (ADMIN/OPERADOR/GESTOR_FILIAL/VISUALIZADOR/CLIENTE),
  `StatusLiberacao`, `TipoAcesso`.

## Variáveis de ambiente

- **Com Docker** (padrão): tudo vem do `.env` da raiz (`POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `JWT_REFRESH_EXPIRES_IN`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `SMTP_*`) — ver
  `.env.example`.
- **`JWT_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN`** (default `1h`/`12h`): a
  autenticação é stateless (JWT puro, sem sessão no banco) — o frontend renova
  o access token sozinho via refresh token quando expira (`frontend/src/services/api.ts`),
  então quem já está logado só é obrigado a logar de novo quando o
  **refresh** token vence, não o access token. Trocar a senha de um usuário
  (admin ou o próprio) **não invalida** tokens já emitidos — eles continuam
  válidos até vencer sozinhos. `JWT_REFRESH_EXPIRES_IN` curto é a mitigação
  atual pra contas compartilhadas por várias pessoas; uma invalidação
  imediata de verdade exigiria guardar um carimbo (`passwordChangedAt`) ou
  uma tabela de sessões — não implementado ainda.
- **SMTP** (recuperação de senha por email) — sem tela de configuração,
  só variável de ambiente. Sem `SMTP_HOST`, o backend não envia o email, só
  loga o conteúdo (com o link) no console — útil em dev sem SMTP real.

  | Variável | Descrição |
  |---|---|
  | `SMTP_HOST` | Endereço do servidor SMTP |
  | `SMTP_PORT` | Porta (`587` STARTTLS é o comum; `465` = SSL direto) |
  | `SMTP_SECURE` | `true` só se a porta for 465 (SSL direto); `false` para 587/STARTTLS |
  | `SMTP_USER` | Usuário/email de autenticação |
  | `SMTP_PASS` | Senha ou app password |
  | `SMTP_FROM` | Remetente, ex: `"Cotton Fibra Forte <no-reply@fibraforte.agr.br>"` |
- **Sem Docker**: `backend/.env` (ver `backend/.env.example`) e `frontend/.env.example`
  (só `VITE_PROXY_TARGET`, usado pelo proxy `/api` do Vite dev server).
- `backend/.env`, `frontend/.env` e o `.env` da raiz estão no `.gitignore` — nunca
  commitar segredo real.

## Produção (Portainer)

- Deploy via Portainer, stack **"cotton_fibraforte"**, método "Repository" (Git),
  branch `main`. **Compose path: `docker-compose.prod.yml`** — só esse arquivo, o
  Portainer usado aqui não aceita múltiplos/lista no campo. É por isso que esse
  arquivo é autossuficiente (não depende de `-f` duplo com o `docker-compose.yml`
  de dev).
- Variáveis do stack são cadastradas na própria tela do Portainer (não vêm de um
  `.env` no repo) — mesma lista da seção acima (Postgres, JWT, `ENCRYPTION_KEY`,
  `FRONTEND_URL`, `SMTP_*`) mais `FRONTEND_PORT`.
- Domínio público: `cotton.fibraforte.agr.br`. Na frente tem **Nginx Proxy
  Manager** (não Traefik) escutando 80/443 no host — por isso `FRONTEND_PORT` não
  pode ser 80/443 (ex: `8081`), e o Proxy Host do NPM aponta pro IP do host +
  essa porta. O backend não expõe porta nenhuma no host (o Nginx do próprio
  frontend já repassa `/api` internamente — ver `frontend/nginx.conf`), então o
  NPM só precisa saber da porta do frontend.
- Nome dos containers no Portainer: `cotton_fibraforte-<serviço>-1` (ex:
  `cotton_fibraforte-postgres-1`, `cotton_fibraforte-backend-1`).
- Redeploy = "Pull and redeploy" (ou "Update the stack" com rebuild) na tela da
  stack no Portainer — necessário depois de qualquer push em `main` pra mudança
  aparecer em produção (não é automático).
- Acesso ao servidor é via SSH (usuário sem permissão direta no Docker — precisa
  `sudo`, ex: `ssh -t usuario@host sudo docker exec cotton_fibraforte-postgres-1 ...`).
  Usado até agora pra importar dados reais direto no Postgres (`psql -f`).

## Convenções

- Nomes de domínio (rotas, enums, campos) em português — manter esse padrão em código
  novo.
- Perfis de usuário controlam acesso; checar `PerfilUsuario` e o middleware `auth.ts`
  antes de expor novos endpoints.
- Não faça deploy nem execute migrações de produção (`migrate:prod` /
  `docker-compose.prod.yml`) sem confirmação explícita do usuário.
- `backend/dist/`, `backend/dev.db` e `.env` **não** devem ser versionados (foram
  removidos do tracking do git — havia segredos reais commitados no histórico;
  recomenda-se rotacionar `JWT_SECRET`/`ENCRYPTION_KEY` de produção caso já estivessem
  em uso real).

## `.claude/`

- `skills/speckit-*` e `skills/loop-sdd` implementam um fluxo formal de Spec-Driven
  Development (spec → plan → tasks → implement), mas este repo **não tem** a pasta
  `.specify/` que esses comandos esperam — hoje estão inativos. Só use esse fluxo se o
  time decidir adotá-lo formalmente (nesse caso, rode `speckit-constitution` primeiro
  para gerar a estrutura).
- Não há mais agents especializados em `.claude/agents/` — os que existiam
  (`public-site-builder`, `deploy-ops`) eram de um template genérico (SaaS
  WhatsApp/Coolify) sem relação com o Cotton e foram removidos.
