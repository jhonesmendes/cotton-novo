# 🎨 Frontend Development Roadmap - Cotton Fibra Forte

## Status Atual: 75% Completo

O frontend está bem estruturado com a maioria dos componentes já implementados. Abaixo está o plano para finalizar a implementação.

---

## 📦 Componentes Existentes

### ✅ Pages (7/7 Completas)
- [x] Login.tsx - Autenticação
- [x] Dashboard - KPIs, Filtros, Tabelas
- [x] Liberacoes - CRUD completo
- [x] Alertas - Visualização de alertas
- [x] Terminais - Gerenciamento
- [x] Modelos - Modelos de carretas
- [x] Usuarios - Gestão de usuários

### ✅ Components
- [x] Layout - Layout principal com sidebar
- [x] UrgenciaBadge - Badge para indicar urgência
- [x] Dashboard components (Resumo, KPIs, Filtros, Tabelas)

### ✅ Services & Hooks
- [x] API Client (axios)
- [x] Auth Store (Zustand)
- [x] React Query integrado

---

## 🎯 Tarefas de Implementação

### FASE 1: Melhorias no Dashboard (CRÍTICO)

#### 1.1 - Adicionar Gráficos
```tsx
// DashboardCharts.tsx
// Usar Recharts para:
// - Distribuição de status por estado
// - Volume de cargas por cliente
// - Timeline de cargas por semana
// - Top 10 clientes por volume
```

**Arquivo:** `frontend/src/pages/Dashboard/DashboardCharts.tsx`

```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

// 4 gráficos principais
1. LineChart - Cargas ao longo do tempo
2. BarChart - Comparativo por cliente
3. PieChart - Distribuição de status
4. AreaChart - Volume acumulado
```

#### 1.2 - Timeline Visual
```tsx
// TimelineStatus.tsx
// Mostrar fluxo: Liberada → Agendada → Carregada → Em trânsito → Finalizada
```

#### 1.3 - Cards de Resumo Rápido
```tsx
// Melhorar DashboardResumo com:
// - Total de cargas ativas
// - Cargas vencendo hoje
// - Em atraso
// - Cargas finalizadas esta semana
```

---

### FASE 2: Melhorias nas Liberações (IMPORTANTE)

#### 2.1 - Form de Liberação Completo
```tsx
// Validar:
// - Email do cliente
// - Data coleta < data deadline
// - Total fardos > 0
// - Terminal selecionado
// - Campos obrigatórios
```

**Validações Faltando:**
- Verificar se cliente existe
- Validar CNPJ do cliente
- Verificar capacidade terminal
- Validar datas (coleta <= deadline)

#### 2.2 - Modal de Veículo Aprimorado
```tsx
// VeiculoModal.tsx
// Adicionar:
// - Auto-complete de motoristas (histórico)
// - Validação de CPF
// - Máscara de telefone
// - Cálculo automático de fardo/peso
```

#### 2.3 - Detalhe com Timeline
```tsx
// LiberacaoDetalhe.tsx
// Mostrar:
// - Timeline de status
// - Histórico de alterações
// - Documentos anexados
// - Comunicações com cliente
```

---

### FASE 3: Melhorias nos Alertas (IMPORTANTE)

#### 3.1 - Dashboard de Alertas
```tsx
// AlertasPage aprimorado:
// - Filtrar por tipo (deadline, atraso, documentação)
// - Filtrar por status (enviado, pendente, falhou)
// - Ações rápidas (WhatsApp, email, ligação)
// - Histórico de alertas enviados
```

#### 3.2 - Configuração de Alertas
```tsx
// AlertasConfigPage.tsx (NOVA)
// - Configurar alertas por cliente
// - Configurar dias antes do deadline
// - Escolher canais (email, WhatsApp)
// - Horários de disparo
```

---

### FASE 4: Melhorias em Dados Sensíveis (SEGURANÇA)

#### 4.1 - Mascaramento de CPF
```tsx
// Exibir: xxx.xxx.xxx-XX (últimos 2 dígitos)
// Implementar: mascaraPF()
```

#### 4.2 - Mascaramento de Telefone
```tsx
// Exibir: (11) 9XXXX-XXXX
// Implementar: mascaraTelefone()
```

#### 4.3 - Criptografia de Dados Sensíveis
```tsx
// Adicionar verificação:
// - LGPD compliance
// - Auditoria de quem visualizou CPF
```

---

### FASE 5: Melhorias de UX (USABILIDADE)

#### 5.1 - Confirmação antes de Deletar
```tsx
// Modal de confirmação:
// "Você tem certeza que deseja deletar a liberação #123?"
// Com aviso: "Esta ação não pode ser desfeita"
```

#### 5.2 - Skeleton Loaders
```tsx
// Ao invés de spinner, mostrar:
// - Skeleton de tabela
// - Skeleton de card
// - Skeleton de form
```

#### 5.3 - Paginação em Tabelas
```tsx
// Adicionar paginação em:
// - VeiculosVencendoTabela (mostrar 10 por página)
// - LiberacoesPage (mostrar 20 por página)
// - AlertasPage (mostrar 15 por página)
```

#### 5.4 - Busca/Filtros Avançados
```tsx
// Adicionar filtros por:
// - Placa do veículo
// - Nome do motorista
// - CPF do motorista
// - Data range (data liberação, deadline)
// - Status específico
```

---

### FASE 6: Formulários e Validações (QUALIDADE)

#### 6.1 - Biblioteca de Validação
```tsx
// Usar Zod (já no backend):
import { z } from 'zod';

const liberacaoSchema = z.object({
  instrucao: z.string().min(1, 'Instrução obrigatória'),
  totalFardos: z.number().positive('Fardos deve ser > 0'),
  deadline: z.date().refine(d => d > new Date(), 'Deadline deve ser no futuro'),
});
```

#### 6.2 - Feedback Visual de Validação
```tsx
// Mostrar:
// - ✓ Campo válido (verde)
// - ✗ Campo inválido (vermelho com mensagem)
// - ⓘ Campo com aviso (amarelo com dica)
```

#### 6.3 - Auto-save em Formulários
```tsx
// Implementar:
// - Salvar rascunho a cada 30 segundos
// - Indicador "Salvando..."
// - "Última alteração: há 2 minutos"
```

---

### FASE 7: Responsive & Mobile (ACESSO)

#### 7.1 - Tabelas Responsivas
```tsx
// Em mobile:
// - Mostrar cards ao invés de tabelas
// - Abreviar colunas (mostrar essencial)
// - Scroll horizontal para colunas extras
```

#### 7.2 - Menus Mobile
```tsx
// - Hamburger menu em telas < 768px
// - Bottom navigation com principais rotas
```

#### 7.3 - Touch-friendly
```tsx
// - Buttons com min 48x48px
// - Espaçamento maior em mobile
// - Inputs com tamanho de fonte 16px (evita zoom)
```

---

### FASE 8: Performance (OTIMIZAÇÃO)

#### 8.1 - Code Splitting
```tsx
// Dividir bundles por rota:
// - Dashboard em um bundle
// - Liberacoes em outro
// - Alertas em outro
```

#### 8.2 - Lazy Loading de Componentes
```tsx
import { lazy, Suspense } from 'react';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

// Renderizar com fallback
<Suspense fallback={<Loading />}>
  <DashboardCharts />
</Suspense>
```

#### 8.3 - Otimizar React Query
```tsx
// Configurar cache inteligente:
// - Dashboard: atualiza a cada 5 min
// - Liberacoes: stale time 1 min
// - Alertas: refetch ao voltar para aba
```

---

## 📋 Checklist de Implementação

### Sprint 1 (Esta semana)
- [ ] Setup backend & frontend rodando
- [ ] Testar autenticação
- [ ] Testar CRUD de liberações
- [ ] Adicionar gráficos ao dashboard
- [ ] Melhorar validações

### Sprint 2 (Próxima semana)
- [ ] Implementar alertas avançados
- [ ] Adicionar timeline em liberações
- [ ] Melhorias de UX (confirmações, skeletons)
- [ ] Responsividade mobile
- [ ] Testes E2E

### Sprint 3 (Semanas seguintes)
- [ ] Performance otimizado
- [ ] PWA (offline mode)
- [ ] Integração WhatsApp
- [ ] Relatórios
- [ ] Deploy em produção

---

## 🛠️ Stack Disponível (Já Instalado)

✅ React 18  
✅ TypeScript  
✅ TailwindCSS  
✅ React Router v6  
✅ React Query v5  
✅ Axios  
✅ Zustand  
✅ React Hot Toast  
✅ Recharts  
✅ @heroicons/react  
✅ date-fns  

**O que adicionar:**
- [ ] React Hook Form - Melhor gerenciamento de forms
- [ ] Zod - Validação de schemas
- [ ] Framer Motion - Animações
- [ ] React Table - Tabelas avançadas

---

## 📚 Arquivo de Referência

Para exemplos, consulte:
- `docs/ARCHITECTURE.md` - Design patterns
- `docs/API.md` - Endpoints disponíveis
- `docs/DATABASE.md` - Estrutura de dados

---

**Status:** 🟡 Em desenvolvimento  
**Último Update:** 2026-05-07  
**Progresso:** 75%
