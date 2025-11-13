# TODO - Roadmap do Projeto

Este documento lista todas as tarefas pendentes e planejadas para o projeto Shopify Batch Fetch.

## 🚨 CRÍTICO - Antes de Deploy em Produção

### Segurança

- [ ] **Implementar criptografia de tokens Shopify usando Supabase Vault**
  - [ ] Criar chave de criptografia no Vault
  - [ ] Criar funções PostgreSQL para encrypt/decrypt
  - [ ] Atualizar schema da tabela `shopify_config`
  - [ ] Atualizar código do cliente para usar RPCs
  - [ ] Migrar tokens existentes (se houver)
  - 📚 Ver: [SECURITY.md](./SECURITY.md#1-armazenamento-de-access-tokens-em-plaintext)

- [ ] **Rotacionar credenciais expostas**
  - [ ] Rotacionar chaves Supabase (se .env foi commitado)
  - [ ] Rotacionar tokens Shopify
  - [ ] Limpar histórico do git se necessário (BFG Repo-Cleaner)

- [ ] **Configurar email verification no Supabase**
  - [ ] Ativar email confirmation nas configs do Supabase
  - [ ] Configurar template de email
  - [ ] Testar fluxo de verificação

- [ ] **Implementar rate limiting**
  - [ ] Configurar Supabase rate limiting
  - [ ] Ou implementar middleware custom
  - [ ] Testar limites de requisições

- [ ] **Integrar logging service**
  - [ ] Criar conta Sentry ou LogRocket
  - [ ] Integrar no código (atualizar `logger.ts`)
  - [ ] Configurar source maps para production
  - [ ] Testar captura de erros

- [ ] **Configurar CSP headers**
  - [ ] Definir Content Security Policy
  - [ ] Configurar no hosting provider
  - [ ] Testar com CSP Evaluator

## 🔥 ALTA PRIORIDADE - Core Functionality

### Integração Shopify API

- [ ] **Instalar e configurar Shopify SDK**
  ```bash
  npm install @shopify/shopify-api
  ```

- [ ] **Criar Supabase Edge Function para Shopify**
  - [ ] Edge Function para autenticação OAuth
  - [ ] Edge Function para fetch de orders
  - [ ] Edge Function para webhook handler
  - [ ] Testes unitários das funções

- [ ] **Implementar OAuth flow do Shopify**
  - [ ] Criar rota de callback OAuth
  - [ ] Armazenar access token (criptografado!)
  - [ ] Atualizar UI em Settings.tsx
  - [ ] Testar com loja de desenvolvimento

- [ ] **Implementar fetch de orders**
  - [ ] Criar cliente Shopify API
  - [ ] Implementar paginação (cursor-based)
  - [ ] Salvar orders no banco de dados
  - [ ] Atualizar last_sync timestamp
  - [ ] Error handling e retry logic

- [ ] **Implementar trigger automático**
  - [ ] Criar Edge Function com cron trigger
  - [ ] Verificar número de orders novas
  - [ ] Executar fetch quando threshold atingido
  - [ ] Logar execução na tabela automation_logs

- [ ] **Implementar Shopify webhooks**
  - [ ] Registrar webhooks (orders/create, orders/updated)
  - [ ] Criar endpoint para receber webhooks
  - [ ] Validar HMAC do webhook
  - [ ] Processar eventos em tempo real
  - [ ] Atualizar orders no banco

### Testing

- [ ] **Criar testes unitários**
  - [ ] Setup Vitest
  - [ ] Testes para validations.ts
  - [ ] Testes para logger.ts
  - [ ] Testes para componentes principais
  - [ ] Target: >80% coverage

- [ ] **Criar testes E2E**
  - [ ] Setup Playwright ou Cypress
  - [ ] Teste de fluxo de autenticação
  - [ ] Teste de configuração Shopify
  - [ ] Teste de visualização de orders

## 📊 MÉDIA PRIORIDADE - UX Improvements

### Dashboard & UI

- [ ] **Melhorar dashboard com gráficos**
  - [ ] Instalar Recharts ou Chart.js
  - [ ] Gráfico de orders por dia/semana/mês
  - [ ] Gráfico de valor total
  - [ ] KPIs animados

- [ ] **Adicionar filtros e paginação**
  - [ ] Filtros por data nas orders
  - [ ] Filtros por status
  - [ ] Paginação server-side
  - [ ] Search/busca nas orders

- [ ] **Melhorar loading states**
  - [ ] Skeleton loaders
  - [ ] Progress indicators
  - [ ] Optimistic UI updates
  - [ ] Toast notifications consistentes

- [ ] **Adicionar exportação de dados**
  - [ ] Exportar orders para CSV
  - [ ] Exportar para Excel (xlsx)
  - [ ] Exportar logs
  - [ ] Download report em PDF

- [ ] **Notificações em tempo real**
  - [ ] Usar Supabase Realtime
  - [ ] Notificar quando orders são adicionadas
  - [ ] Notificar quando automation roda
  - [ ] Badge com contador não lido

### Settings & Config

- [ ] **Melhorar página de Settings**
  - [ ] Botão "Test Connection" para Shopify
  - [ ] Preview de última ordem fetchada
  - [ ] Histórico de configurações
  - [ ] Ajuda inline com tooltips

- [ ] **Adicionar opções de automação avançadas**
  - [ ] Múltiplos triggers (por valor, por produto)
  - [ ] Horários específicos para rodar
  - [ ] Filtros de orders (apenas fulfilled, etc)

## 🔧 BAIXA PRIORIDADE - Nice to Have

### Features Adicionais

- [ ] **Multi-tenancy completo**
  - [ ] Suporte a múltiplas lojas por usuário
  - [ ] Switch entre lojas no dashboard
  - [ ] Configurações por loja

- [ ] **Integração com outras plataformas**
  - [ ] WooCommerce
  - [ ] Magento
  - [ ] Big Commerce

- [ ] **API REST para integração externa**
  - [ ] Documentação OpenAPI/Swagger
  - [ ] API keys para autenticação
  - [ ] Rate limiting na API

- [ ] **Relatórios customizáveis**
  - [ ] Report builder
  - [ ] Scheduled reports (daily/weekly)
  - [ ] Email com reports

- [ ] **Tema dark mode**
  - [ ] Toggle dark/light mode
  - [ ] Persistir preferência
  - [ ] Adaptar todos os componentes

### DevOps & Infrastructure

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions para testes
  - [ ] Auto-deploy em push para main
  - [ ] Deploy preview para PRs
  - [ ] Auto-versioning com tags

- [ ] **Monitoring & Alertas**
  - [ ] Setup Uptime monitoring
  - [ ] Alertas para erros críticos
  - [ ] Métricas de performance
  - [ ] Dashboard de health check

- [ ] **Backup & Recovery**
  - [ ] Backup automático do Supabase
  - [ ] Documentar recovery procedures
  - [ ] Testar restore de backups

- [ ] **Documentation**
  - [ ] Documentação de API
  - [ ] Storybook para componentes
  - [ ] Videos tutoriais
  - [ ] FAQ expandido

## ✅ COMPLETO

### Segurança Implementada ✅

- [x] Remover .env do git e adicionar ao .gitignore
- [x] Criar .env.example
- [x] Habilitar TypeScript strict mode
- [x] Implementar validação Zod
- [x] Senhas fortes (8+ chars, complexidade)
- [x] Validação de URL e token Shopify
- [x] Logging seguro (desabilitado em produção)

### Features Implementadas ✅

- [x] Autenticação (login/register)
- [x] Recuperação de senha
- [x] Dashboard básico
- [x] Página de Orders
- [x] Página de Logs
- [x] Página de Settings
- [x] Protected routes
- [x] Row Level Security (RLS)

### Documentação ✅

- [x] README.md atualizado
- [x] SECURITY.md criado
- [x] TODO.md criado (este arquivo)

---

## 📅 Timeline Sugerido

### Sprint 1 (2 semanas) - Segurança & Shopify Core
- Criptografia de tokens
- Integração Shopify OAuth
- Fetch básico de orders

### Sprint 2 (2 semanas) - Automação
- Edge Functions com cron
- Webhooks do Shopify
- Logging melhorado

### Sprint 3 (1-2 semanas) - Testing & Polish
- Testes unitários e E2E
- UX improvements
- Rate limiting e monitoring

### Sprint 4+ - Features Adicionais
- Dashboard com gráficos
- Exportação de dados
- Features avançadas

---

**Última Atualização**: 2025-11-13
**Progresso Geral**: ~40% (UI completa, backend parcial, integrações pendentes)
