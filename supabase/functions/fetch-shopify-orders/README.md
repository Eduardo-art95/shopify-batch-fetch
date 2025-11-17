# Fetch Shopify Orders Edge Function

Esta Edge Function busca pedidos da loja Shopify do usuário e salva no banco de dados.

## Funcionalidades

- Autenticação via JWT token do usuário
- Busca configurações do Shopify do banco de dados
- Conecta à API do Shopify e busca pedidos recentes
- Salva/atualiza pedidos na tabela `orders`
- Atualiza timestamp de última sincronização
- Registra logs de execução (sucesso/erro)

## Deploy Manual

### Via Supabase CLI

```bash
# 1. Instalar Supabase CLI
brew install supabase/tap/supabase  # macOS
# ou ver https://supabase.com/docs/guides/cli

# 2. Login no Supabase
supabase login

# 3. Link ao projeto
supabase link --project-ref hzdmqymvvhdesmcexdgl

# 4. Deploy da função
supabase functions deploy fetch-shopify-orders
```

### Via Dashboard do Supabase

1. Acesse https://supabase.com/dashboard/project/hzdmqymvvhdesmcexdgl/functions
2. Clique em "New Function"
3. Nome: `fetch-shopify-orders`
4. Cole o código do arquivo `index.ts`
5. Clique em "Deploy"

## Uso

```bash
curl -X POST \
  'https://hzdmqymvvhdesmcexdgl.supabase.co/functions/v1/fetch-shopify-orders' \
  -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

## Resposta

```json
{
  "success": true,
  "message": "Successfully fetched 10 orders, saved 10",
  "orders_fetched": 10,
  "orders_saved": 10
}
```

## Variáveis de Ambiente

A função usa automaticamente:
- `SUPABASE_URL` - URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (para operações admin)

## Estrutura

```
fetch-shopify-orders/
├── index.ts    # Código principal da função
└── README.md   # Esta documentação
```
