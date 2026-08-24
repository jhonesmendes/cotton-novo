# syntax=docker/dockerfile:1

# ─── deps: instala dependências ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ─── dev: vite dev server com hot-reload ───────────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── build: gera o bundle estático ─────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ─── prod: nginx servindo os estáticos + proxy /api p/ o backend ──────────────
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
