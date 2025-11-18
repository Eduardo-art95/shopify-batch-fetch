# Deploy da Aplicação

## Deploy Automático no Netlify (Recomendado)

### 1. Criar conta no Netlify
- Acede a https://app.netlify.com/signup
- Regista-te com a tua conta GitHub

### 2. Importar Projeto
- No dashboard, clica em **"Add new site"** → **"Import an existing project"**
- Seleciona **"Deploy with GitHub"**
- Autoriza o Netlify a aceder ao GitHub (se ainda não o fizeste)
- Procura e seleciona o repositório `shopify-batch-fetch`
- Clica em **"Deploy site"** (não precisas de configurar nada, o `netlify.toml` já está configurado)

### 3. Configurar Variáveis de Ambiente
Depois do primeiro deploy:
- Vai a **Site settings** → **Environment variables**
- Clica em **"Add a variable"** e adiciona estas 3 variáveis:

```
VITE_SUPABASE_PROJECT_ID=hzdmqymvvhdesmcexdgl
VITE_SUPABASE_URL=https://hzdmqymvvhdesmcexdgl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZG1xeW12dmhkZXNtY2V4ZGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjcxNjUsImV4cCI6MjA3ODU0MzE2NX0.uQMS9M6hF_cBboAJiZ-8_wiLuLHtkPmTTl1eeVx1elY
```

### 4. Re-deploy com as variáveis
- Vai a **Deploys**
- Clica em **"Trigger deploy"** → **"Deploy site"**
- Aguarda 1-2 minutos

### 5. Acesso
Recebes um URL tipo: `https://shopify-batch-fetch.netlify.app`
Podes aceder de qualquer computador/telemóvel!

**Dica:** Podes personalizar o URL em **Site settings** → **Domain management** → **"Change site name"**

---

## Configuração do Supabase

Depois do deploy no Vercel, precisas:

### 1. Aplicar Migrations
```bash
# Na tua máquina local
supabase login
supabase link --project-ref hzdmqymvvhdesmcexdgl
supabase db push
```

Ou no dashboard: https://supabase.com/dashboard/project/hzdmqymvvhdesmcexdgl/editor
- SQL Editor → cola o conteúdo de `supabase/migrations/20251117210000_add_custom_fields.sql`

### 2. Deploy Edge Function
```bash
supabase functions deploy fetch-shopify-orders
```

---

## Testar Tudo

1. Acede ao URL do Vercel
2. Cria conta ou faz login
3. Vai a Configurações
4. Preenche com os teus dados Shopify:
   - URL: `tua-loja.myshopify.com`
   - Token: `shpss_xxxxxxxxxxxxx`
5. Seleciona os campos que queres extrair
6. Clica "Testar Conexão e Buscar Encomendas"

✅ Pronto! A aplicação está online e acessível de qualquer lugar.

---

## Alternativa: Vercel

Se preferires usar Vercel:
1. Acede a https://vercel.com/signup
2. Regista-te com GitHub
3. Clica em "Add New..." → "Project"
4. Seleciona o repositório `shopify-batch-fetch`
5. Adiciona as mesmas 3 variáveis de ambiente
6. Clica em "Deploy"
7. Pronto! URL: `https://shopify-batch-fetch.vercel.app`
