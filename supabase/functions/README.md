# Supabase Edge Functions - Shopify Integration

Este diretório contém as Edge Functions necessárias para a integração com o Shopify.

## Funções Disponíveis

### 1. `test-shopify-connection`
Testa a conexão com a API do Shopify validando as credenciais.

**Endpoint:** `POST /functions/v1/test-shopify-connection`

**Headers:**
- `Authorization: Bearer <user_access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "shop_url": "minhaloja.myshopify.com",
  "access_token": "shpat_xxxxxxxxx"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "shop": {
    "name": "Minha Loja",
    "email": "loja@email.com",
    "domain": "minhaloja.myshopify.com",
    "plan_name": "Basic",
    "currency": "EUR"
  }
}
```

### 2. `fetch-shopify-orders`
Busca encomendas do Shopify e guarda na base de dados.

**Endpoint:** `POST /functions/v1/fetch-shopify-orders`

**Headers:**
- `Authorization: Bearer <user_access_token>`
- `Content-Type: application/json`

**Body (opcional):**
```json
{
  "since_id": "123456789",
  "limit": 50
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "orders_fetched": 25,
  "message": "25 encomendas sincronizadas com sucesso"
}
```

## Deploy das Funções

### Pré-requisitos
1. Instalar o Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Fazer login:
   ```bash
   supabase login
   ```

3. Linkar o projeto:
   ```bash
   supabase link --project-ref hzdmqymvvhdesmcexdgl
   ```

### Deploy

Para fazer deploy de todas as funções:
```bash
supabase functions deploy
```

Para fazer deploy de uma função específica:
```bash
supabase functions deploy test-shopify-connection
supabase functions deploy fetch-shopify-orders
```

### Configuração de Secrets

As funções usam variáveis de ambiente do Supabase automaticamente:
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_ANON_KEY` - Chave pública
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (para operações admin)

Estas são configuradas automaticamente pelo Supabase.

## Testar Localmente

1. Iniciar o Supabase local:
   ```bash
   supabase start
   ```

2. Servir as funções:
   ```bash
   supabase functions serve
   ```

3. Testar com curl:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/test-shopify-connection \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"shop_url": "loja.myshopify.com", "access_token": "shpat_xxx"}'
   ```

## Erros Comuns

### 401 - Token inválido
O access token do Shopify está incorreto ou não tem as permissões necessárias.

### 403 - Acesso negado
A app no Shopify não tem permissão de `read_orders`.

### 404 - Loja não encontrada
O URL da loja está incorreto. Use o domínio `.myshopify.com`.

### Edge Function não disponível
As funções ainda não foram deployadas. Execute `supabase functions deploy`.

## Segurança

- Todas as funções requerem autenticação do usuário
- As credenciais do Shopify são armazenadas de forma segura no Supabase
- Row Level Security (RLS) garante que cada usuário só acede aos seus dados
- Os tokens nunca são expostos ao cliente

## Monitorização

Verifique os logs das funções no Supabase Dashboard:
1. Aceda ao painel do Supabase
2. Vá a **Edge Functions**
3. Selecione a função
4. Veja os logs em tempo real

## Limites

- Rate limit da API Shopify: 2 requests/segundo
- Máximo 250 encomendas por request
- Timeout das Edge Functions: 60 segundos
