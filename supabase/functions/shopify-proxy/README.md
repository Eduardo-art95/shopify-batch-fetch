# Shopify Proxy Edge Function

Esta Edge Function resolve o problema de CORS fazendo proxy das chamadas à Shopify Admin API.

## Deploy

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Linkar o projeto

```bash
supabase link --project-ref hzdmqymvvhdesmcexdgl
```

### 4. Deploy da função

```bash
supabase functions deploy shopify-proxy
```

### 5. Configurar secrets (opcional)

Se quiseres adicionar secrets:

```bash
supabase secrets set SHOPIFY_API_VERSION=2024-01
```

## Uso

A função aceita um POST request com:

```json
{
  "shop_url": "minhaloja.myshopify.com",
  "access_token": "shpat_...",
  "endpoint": "/orders/count.json",
  "method": "GET"
}
```

### Endpoints Shopify suportados

- `/orders.json` - Lista encomendas
- `/orders/count.json` - Conta encomendas
- `/orders/{id}.json` - Detalhes de encomenda

## Segurança

- A função **não** armazena tokens
- Os tokens são passados apenas em runtime
- Recomenda-se validação adicional no frontend

## Troubleshooting

**Erro de CORS:**
- Verifica se a função foi deployed corretamente
- Confirma que o projeto Supabase está correto

**Erro 401/403:**
- Verifica o access token da Shopify
- Confirma que a app tem permissão `read_orders`

**Timeout:**
- A Shopify API pode demorar com muitas encomendas
- Considera reduzir o `limit` por request
