# 🎬 GUIA VISUAL - Como Iniciar o Projeto (Passo a Passo)

## Seu Problema: ERR_CONNECTION_REFUSED (-102) em http://localhost:5173/

**Causa:** Frontend (Vite) não está rodando.  
**Solução:** 3 passos simples.

---

## PASSO 1: Abrir Terminal

### No Windows:

1. Abra: `Explorador de Arquivos`
2. Navegue até: `c:\xampp\htdocs\cotton\frontend`
3. Clique na barra de endereço (onde aparece o caminho)
4. Digite: `cmd`
5. Pressione: `Enter`

Agora você tem um terminal aberto na pasta frontend.

---

## PASSO 2: Instalar Dependências

No terminal que você abriu, digite:

```bash
npm install
```

Pressione `Enter` e aguarde.

**Esperado:**
```
... (muitas linhas)
added XXX packages in XXs
```

Pode levar 2-5 minutos dependendo da internet.

---

## PASSO 3: Iniciar o Vite

No mesmo terminal, digite:

```bash
npm run dev
```

Pressione `Enter`.

**Esperado (dentro de 10 segundos):**
```
VITE v5.0.11  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

✅ Se viu isso, o frontend está rodando!

**IMPORTANTE:** Não feche este terminal! Deixe rodando em background.

---

## PASSO 4: Abrir no Browser

1. Abra seu navegador (Chrome, Edge, Firefox, etc)
2. Clique na barra de endereço
3. Digite: `http://localhost:5173/`
4. Pressione: `Enter`

**Esperado:**
```
Cotton Fibra Forte
Sistema de Gestão de Cargas

[Email e Senha inputs]
```

---

## ✅ Sucesso!

Se você vê a página de login acima, está funcionando! 🎉

Agora você pode fazer login e acessar o dashboard.

---

## ❌ Se Não Funcionar

### Erro: "Port 5173 already in use"

```
Error: listen EADDRINUSE: address already in use :::5173
```

**Solução:**

Abra um novo terminal e execute:

```bash
taskkill /IM node.exe /F
```

Aguarde 5 segundos. Depois tente novamente:

```bash
npm run dev
```

---

### Erro: "Cannot find module"

```
Error: Cannot find module 'vite'
```

**Solução:**

```bash
npm install --force
npm run dev
```

---

### Erro: Terminal não abre / Outro erro

**Solução Alternativa:**

1. Abra: `cmd` (Prompt de Comando do Windows)
2. Digite: `cd c:\xampp\htdocs\cotton\frontend`
3. Pressione: `Enter`
4. Digite: `npm install`
5. Aguarde terminar
6. Digite: `npm run dev`
7. Aguarde aparecer a mensagem com http://localhost:5173/

---

## 📞 Checklist de Sucesso

- [ ] Abri o terminal na pasta `frontend`
- [ ] Executei `npm install`
- [ ] Executei `npm run dev`
- [ ] Vejo a mensagem com `http://localhost:5173/`
- [ ] Abri o browser em `http://localhost:5173/`
- [ ] Vejo a página de login

Se todos os itens estão marcados ✅, pronto! 

---

## 🎯 Próximas Ações

Após tela de login:

1. **Faça login** (peça credenciais ao administrador)
2. **Veja o Dashboard** com gráficos
3. **Explore as páginas** (Liberações, Alertas, etc)
4. **Leia:** `PROXIMOS_PASSOS.md` para próximas features

---

## 🆘 Ainda Não Funciona?

Se após seguir tudo acima ainda não funciona, execute:

```bash
cd c:\xampp\htdocs\cotton\frontend
npm run dev
```

E copie **TUDO** que aparecer na tela (erro completo).

Depois compartilhe para diagnóstico mais específico.

---

**Data:** 2026-05-07  
**Status:** Guia Visual Completo
