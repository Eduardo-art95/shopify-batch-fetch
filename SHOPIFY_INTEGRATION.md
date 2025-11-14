# Integração Shopify - Guia Completo

Este documento descreve a integração com a API do Shopify implementada no projeto Shopify Batch Fetch.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração](#configuração)
4. [Como Usar](#como-usar)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)
7. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

A integração permite:
- ✅ Conectar lojas Shopify usando Access Token
- ✅ Testar conexão com a loja
- ✅ Buscar encomendas (orders) da API do Shopify
- ✅ Sincronizar encomendas para o banco de dados
- ✅ Filtrar encomendas por data
- ✅ Retry automático em caso de falhas
- ✅ Logging seguro de operações

## 🏗️ Arquitetura

### Componentes Principais

```
src/
├── lib/
│   ├── shopify-client.ts      # Cliente da API Shopify
│   ├── shopify-utils.ts       # Utilitários e transformações
│   ├── logger.ts              # Logger seguro
│   └── validations.ts         # Schemas Zod
├── hooks/
│   └── useShopify.tsx         # React hook para Shopify
└── pages/
    ├── Settings.tsx           # Configuração Shopify
    └── Sync.tsx               # Sincronização manual
```

### Fluxo de Dados

```
┌─────────────┐       ┌──────────────────┐       ┌────────────┐
│   Shopify   │◄──────┤ ShopifyClient    │◄──────┤  useShopify│
│     API     │       │  (REST API)      │       │    Hook    │
└─────────────┘       └──────────────────┘       └────────────┘
                              │                         │
                              │                         │
                              ▼                         ▼
                      ┌──────────────────┐      ┌────────────┐
                      │  shopify-utils   │      │  Supabase  │
                      │ (transformação)  │      │  Database  │
                      └──────────────────┘      └────────────┘
```

---

## ⚙️ Configuração

### 1. Criar Aplicação Privada no Shopify

1. Acesse o **Admin do Shopify**
2. Vá para **Apps** → **Develop apps**
3. Clique em **Create an app**
4. Dê um nome (ex: "Batch Fetch Integration")
5. Em **Configuration**, configure os **Admin API access scopes**:
   - ✅ `read_orders`
   - ✅ `read_customers` (opcional, para dados de cliente)
   - ✅ `read_products` (opcional, para detalhes de produtos)
6. Clique em **Install app**
7. Copie o **Admin API access token** (shpat_...)

### 2. Configurar no Sistema

1. Acesse **/settings** no sistema
2. Preencha:
   - **URL da Loja**: `sualojas.myshopify.com`
   - **Access Token**: `shpat_xxxxxxxxxxxxx`
3. Clique em **"Testar Conexão"** para verificar
4. Se sucesso, clique em **"Guardar Configurações"**

---

## 🚀 Como Usar

### Teste de Conexão

```typescript
import { useShopify } from '@/hooks/useShopify';

const { testConnection } = useShopify();

const result = await testConnection(
  'minhaloja.myshopify.com',
  'shpat_xxxxxxxxxxxxx'
);

if (result.success) {
  console.log(`Conectado: ${result.shopName}`);
}
```

### Sincronizar Encomendas

```typescript
import { useShopify } from '@/hooks/useShopify';

const { syncOrders } = useShopify();

// Sincronizar últimas 250 encomendas
const result = await syncOrders({ limit: 250 });

// Sincronizar últimos 30 dias
const result = await syncOrders({
  limit: 250,
  created_at_min: '2024-10-01T00:00:00Z'
});

console.log(`${result.count} encomendas sincronizadas`);
```

### Usando o Cliente Diretamente

```typescript
import { createShopifyClient } from '@/lib/shopify-client';

const client = createShopifyClient({
  shop_url: 'minhaloja.myshopify.com',
  access_token: 'shpat_xxxxxxxxxxxxx',
});

// Buscar encomendas
const orders = await client.fetchOrders({
  limit: 50,
  status: 'any',
  created_at_min: '2024-01-01T00:00:00Z',
});

// Contar encomendas
const count = await client.getOrderCount({
  status: 'open',
});

// Buscar uma encomenda específica
const order = await client.fetchOrder(123456789);
```

---

## 📚 API Reference

### ShopifyClient

#### Métodos

##### `testConnection()`
Testa a conexão com a loja Shopify.

```typescript
async testConnection(): Promise<{
  success: boolean;
  shop?: any;
  error?: string;
}>
```

**Exemplo:**
```typescript
const result = await client.testConnection();
```

---

##### `fetchOrders(options)`
Busca encomendas da API do Shopify.

```typescript
async fetchOrders(options?: FetchOrdersOptions): Promise<ShopifyOrder[]>
```

**Parâmetros:**
- `limit` (number): Número máximo de encomendas (padrão: 50, máx: 250)
- `status` ('any' | 'open' | 'closed' | 'cancelled'): Status das encomendas
- `created_at_min` (string): Data mínima (ISO 8601)
- `created_at_max` (string): Data máxima (ISO 8601)
- `updated_at_min` (string): Data de atualização mínima
- `updated_at_max` (string): Data de atualização máxima

**Exemplo:**
```typescript
const orders = await client.fetchOrders({
  limit: 100,
  status: 'open',
  created_at_min: '2024-01-01T00:00:00Z',
});
```

---

##### `getOrderCount(options)`
Obtém a contagem de encomendas.

```typescript
async getOrderCount(options?: Omit<FetchOrdersOptions, 'limit'>): Promise<number>
```

**Exemplo:**
```typescript
const count = await client.getOrderCount({ status: 'open' });
console.log(`${count} encomendas abertas`);
```

---

### useShopify Hook

#### Funções

##### `testConnection(shopUrl, accessToken)`
```typescript
testConnection: (shopUrl: string, accessToken: string) => Promise<{
  success: boolean;
  shopName?: string;
  error?: string;
}>
```

##### `syncOrders(options)`
```typescript
syncOrders: (options?: FetchOrdersOptions) => Promise<{
  success: boolean;
  count: number;
  error?: string;
}>
```

##### `getOrderCount()`
```typescript
getOrderCount: () => Promise<number | null>
```

#### Estados

- `loading` (boolean): Operação em progresso
- `syncing` (boolean): Sincronização em progresso

---

### Utilitários

#### `transformOrderForDatabase(order, userId)`
Transforma uma order do Shopify para o formato do banco de dados.

```typescript
function transformOrderForDatabase(
  order: ShopifyOrder,
  userId: string
): DatabaseOrder
```

#### `withRetry(fn, options)`
Executa uma função com retry automático.

```typescript
function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;    // Padrão: 3
    delay?: number;      // Padrão: 1000ms
    backoff?: number;    // Padrão: 2 (exponencial)
  }
): Promise<T>
```

**Exemplo:**
```typescript
const result = await withRetry(
  () => client.fetchOrders(),
  { retries: 5, delay: 2000 }
);
```

#### `getDateRange(days)`
Calcula range de datas para filtros.

```typescript
function getDateRange(days: number): {
  start: string;
  end: string;
}
```

---

## 🐛 Troubleshooting

### Erro: "Shopify API error: 401"

**Causa:** Access token inválido ou expirado.

**Solução:**
1. Verifique se o token está correto
2. Gere um novo token no Shopify Admin
3. Atualize nas configurações

---

### Erro: "Shopify API error: 403"

**Causa:** Permissões insuficientes no token.

**Solução:**
1. Verifique os **API scopes** configurados
2. Adicione `read_orders` ao app
3. Reinstale o app e gere novo token

---

### Erro: "Connection timeout"

**Causa:** Problemas de rede ou rate limiting.

**Solução:**
- O sistema já tem retry automático (3 tentativas)
- Se persistir, aguarde alguns minutos (rate limit)
- Verifique sua conexão com a internet

---

### Encomendas não aparecem

**Possíveis causas:**
1. Filtros muito restritivos
2. Loja sem encomendas no período
3. Status das encomendas

**Solução:**
- Use "Sincronizar Tudo" primeiro
- Verifique os filtros de data
- Confirme que há encomendas no Shopify Admin

---

### Erro: "Rate limit exceeded"

**Causa:** Muitas requisições em curto período.

**Solução:**
- Aguarde 1-2 minutos
- Use filtros de data para reduzir volume
- A API do Shopify tem limite de 4 req/s

---

## 🔐 Segurança

### ⚠️ IMPORTANTE

1. **Tokens em Plaintext**: Atualmente os access tokens são armazenados em plaintext no banco de dados.
   - **Solução**: Implementar Supabase Vault (ver `SECURITY.md`)

2. **Execução Client-Side**: A integração roda no navegador.
   - **Recomendação**: Para produção, mover para Supabase Edge Functions

3. **CORS**: Certifique-se que o domínio está autorizado no Shopify

### Boas Práticas

- ✅ Nunca exponha access tokens em logs
- ✅ Use HTTPS em produção
- ✅ Rotacione tokens regularmente
- ✅ Implemente rate limiting
- ✅ Monitore uso da API

---

## 🚀 Próximos Passos

### Alta Prioridade

- [ ] **Implementar Supabase Edge Functions**
  - Mover lógica para server-side
  - Proteger access tokens
  - Implementar autenticação

- [ ] **Implementar Cron Jobs**
  - Sincronização automática baseada em trigger
  - Verificação periódica de novas encomendas
  - Alertas quando threshold atingido

- [ ] **Webhooks do Shopify**
  - Receber notificações em tempo real
  - Processar events (orders/create, orders/updated)
  - Validar HMAC de webhooks

### Média Prioridade

- [ ] **Paginação Completa**
  - Implementar cursor-based pagination
  - Sincronizar grandes volumes (>250 orders)

- [ ] **Cache**
  - Cache de configurações
  - Cache de dados menos voláteis

- [ ] **Métricas**
  - Dashboard com estatísticas
  - Gráficos de encomendas por período
  - Alertas de anomalias

### Baixa Prioridade

- [ ] **Multi-Store Support**
  - Múltiplas lojas por usuário
  - Switch entre lojas

- [ ] **Exportação Avançada**
  - Exportar para Excel
  - Exportar para CSV
  - Filtros customizados

---

## 📖 Recursos Adicionais

- [Shopify REST Admin API Docs](https://shopify.dev/docs/api/admin-rest)
- [Shopify API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- [Shopify OAuth](https://shopify.dev/docs/apps/auth/oauth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 📞 Suporte

Para questões sobre a integração:
- Consulte `SECURITY.md` para questões de segurança
- Consulte `TODO.md` para roadmap
- Abra uma issue no GitHub para bugs

---

**Última Atualização**: 2025-11-14
**Versão da Integração**: 1.0.0
**Status**: ✅ Funcional (Client-Side)
