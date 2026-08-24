# syntax=docker/dockerfile:1

# ─── deps: instala dependências (com toolchain nativo p/ sqlite3) ─────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# ─── dev: hot-reload via ts-node-dev ───────────────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ─── build: compila TS + gera prisma client + remove devDependencies ──────────
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ─── prod: imagem final enxuta, sem toolchain de build ─────────────────────────
FROM node:20-bookworm-slim AS prod
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/app.js"]
