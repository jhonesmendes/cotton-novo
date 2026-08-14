# ⚡ COMECE AQUI - Instruções Rápidas

## 🎯 Objetivo
Rodar o sistema Cotton Fibra Forte localmente em 5 minutos.

---

## 📋 Pré-Requisitos Verificados
- ✅ Node.js 18+ (verificar: `node --version`)
- ✅ npm (verificar: `npm --version`)
- ✅ Git (opcional, já tem projeto)

---

## ⚡ Passo 1: Backend (2 minutos)

Abra o terminal e execute:

```bash
cd c:\xampp\htdocs\cotton\backend
npm install
npm run generate
npm run migrate
npm run dev
```

**Esperado:**
```
🚀 Cotton Backend rodando em http://localhost:3001
```

✅ Se vir isso, Backend está OK! Deixe rodando.

---

## ⚡ Passo 2: Frontend (2 minutos)

Abra UM NOVO terminal (não feche o anterior) e execute:

```bash
cd c:\xampp\htdocs\cotton\frontend
npm install
npm run dev
```

**Esperado:**
```
VITE v5.0.11 ready in XXXms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

✅ Se vir isso, Frontend está OK!

---

## 🌐 Passo 3: Usar o Sistema

1. Abra browser: http://localhost:5173
2. Você será redirecionado para login
3. Teste com email/senha (pergunte ao admin)
4. Clique em Dashboard
5. 🎉 Você verá gráficos, KPIs e tabelas!

---

## 🔍 Se Algo Não Funcionar

### Erro: "ts-node-dev not found"
```bash
npm install -D ts-node-dev@latest
npm run dev
```

### Erro: "Cannot GET /"
- Certifique-se que BACKEND está rodando (porta 3001)
- Vá para terminal onde backend roda e veja erros

### Erro: "Connection refused"
```bash
# Verificar se porta 3001 está em uso
netstat -ano | findstr :3001
# Se estiver, termine o processo anterior
```

### Erro: "EADDRINUSE - Port 3001 already in use"
```bash
# Encontre o PID e mate o processo
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

---

## ✅ Checklist de Sucesso

- [ ] Backend rodando em http://localhost:3001
- [ ] Frontend rodando em http://localhost:5173
- [ ] Pode fazer login
- [ ] Dashboard exibe 4 gráficos
- [ ] Dashboard exibe KPIs (cards)
- [ ] Pode acessar outras páginas (Liberações, Alertas, etc)

---

## 📚 Documentos de Referência

Depois que rodar, leia:

1. **PROXIMOS_PASSOS.md** - O que fazer depois
2. **SETUP_GUIA.md** - Detalhes técnicos
3. **FRONTEND_ROADMAP.md** - Mapa de features
4. **docs/API.md** - Endpoints disponíveis

---

## 🚀 Pronto!

Você tem tudo que precisa. Agora é só executar os 3 passos acima.

**Dúvidas?** Consulte **PROXIMOS_PASSOS.md** ou **SETUP_GUIA.md**.

---

**Boa sorte! 💪**
