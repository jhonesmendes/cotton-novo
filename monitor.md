# Monitoramento de deadline (timeline nov/2026)

```
AGUARDANDO GR → TRÂNSITO CARREGAMENTO → LOCAL   ── deadline monitorado (ainda não carregou)
    → MANIFESTADO → FALTA AGENDAR → AGENDADO → AGUARDANDO DESCARGA → FINALIZADO
      └── a partir daqui conta como carregado: o deadline (de carregamento) deixa de valer
```

- O deadline da liberação é de **carregamento**. Alertas e Dashboard só cobram prazo de
  veículos ativos antes de MANIFESTADO (`STATUS_MONITORAMENTO` em
  `backend/src/services/liberacao-status.ts`).
- Liberação com tudo carregado não aparece como vencida, mesmo com a data passada.
- Liberação SUSPENSA não gera alertas; veículo inativo não é monitorado.
- Alerta "Pendência de fechamento": todos os veículos finalizados com dado faltando
  (ver checklist em `checklistFechamento`).
