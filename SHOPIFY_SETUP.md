# Configuração da Integração Shopify

Este documento explica como configurar a integração OAuth com o Shopify.

## 1. Configuração no Shopify Partners

### No Dashboard do Shopify Partners:

1. Aceda a https://partners.shopify.com
2. Vá para **Apps** → selecione a sua app
3. Em **App setup** → **URLs**:
   - **App URL**: URL da sua aplicação (ex: `https://suaapp.lovable.app`)
   - **Allowed redirection URL(s)**:
     - Para desenvolvimento: `http://localhost:8080/shopify/callback`
     - Para produção: `https://suaapp.lovable.app/shopify/callback`

4. Em **API access scopes**, certifique-se que tem:
   - `read_orders` (obrigatório)
   - `read_customers` (recomendado)

## 2. Variáveis de Ambiente - Frontend (.env)

```bash
# Já configurado
VITE_SHOPIFY_CLIENT_ID="73157a002d9436bc8d26061191a45ba5"
VITE_SHOPIFY_REDIRECT_URI="http://localhost:8080/shopify/callback"
VITE_SHOPIFY_SCOPES="read_orders,read_customers"
```

## 3. Configuração das Edge Functions no Supabase

### Passo 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

### Passo 2: Login no Supabase

```bash
supabase login
```

### Passo 3: Configurar Secrets (IMPORTANTE!)

As credenciais secretas devem ser configuradas no Supabase:

```bash
# No diretório do projeto
supabase secrets set SHOPIFY_CLIENT_ID=your_client_id_here
supabase secrets set SHOPIFY_CLIENT_SECRET=your_client_secret_here
```

### Passo 4: Deploy das Edge Functions

```bash
# Deploy da função de OAuth callback
supabase functions deploy shopify-oauth-callback --project-ref hzdmqymvvhdesmcexdgl

# Deploy da função de API proxy
supabase functions deploy shopify-api --project-ref hzdmqymvvhdesmcexdgl
```

## 4. Testar a Integração

1. Inicie a aplicação localmente:
   ```bash
   npm run dev
   ```

2. Aceda a `/settings`

3. Introduza o URL da sua loja de teste (ex: `minhaloja.myshopify.com`)

4. Clique em "Conectar ao Shopify"

5. Autorize a aplicação no Shopify

6. Será redirecionado de volta e a conexão estará completa

## 5. Para Produção

### Atualizar URLs:

1. No `.env`:
   ```bash
   VITE_SHOPIFY_REDIRECT_URI="https://suaapp.lovable.app/shopify/callback"
   ```

2. No Shopify Partners Dashboard:
   - Adicionar `https://suaapp.lovable.app/shopify/callback` aos Allowed redirection URLs

### Segurança:

- **NUNCA** exponha o `SHOPIFY_CLIENT_SECRET` no frontend
- As Edge Functions guardam o secret de forma segura
- Os tokens de acesso são armazenados encriptados no Supabase

## 6. Estrutura dos Ficheiros

```
supabase/
  functions/
    shopify-oauth-callback/
      index.ts          # Troca código OAuth por token
    shopify-api/
      index.ts          # Proxy seguro para API Shopify

src/
  services/
    shopify.ts          # Cliente frontend para Shopify
  pages/
    ShopifyCallback.tsx # Página de callback OAuth
    Settings.tsx        # Configurações com botão OAuth
```

## 7. Troubleshooting

### Erro: "Invalid redirect URI"
- Verifique se o URL no `.env` corresponde exatamente ao configurado no Shopify Partners

### Erro: "Invalid client_id"
- Confirme o Client ID no Supabase secrets

### Erro: "Scope not available"
- Verifique se os scopes estão habilitados na app do Shopify Partners

### Erro ao buscar pedidos:
- Confirme que o token foi guardado corretamente na base de dados
- Verifique os logs no Supabase Dashboard → Functions → Logs
