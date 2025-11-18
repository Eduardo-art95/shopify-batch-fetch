# Deploy da Aplicação

## Deploy Automático no Vercel (Recomendado)

### 1. Criar conta no Vercel
- Acede a https://vercel.com/signup
- Regista-te com a tua conta GitHub

### 2. Importar Projeto
- Clica em "Add New..." → "Project"
- Seleciona o repositório `shopify-batch-fetch`
- Clica em "Import"

### 3. Configurar Variáveis de Ambiente
No dashboard do Vercel, adiciona estas variáveis:
```
VITE_SUPABASE_PROJECT_ID=hzdmqymvvhdesmcexdgl
VITE_SUPABASE_URL=https://hzdmqymvvhdesmcexdgl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZG1xeW12dmhkZXNtY2V4ZGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjcxNjUsImV4cCI6MjA3ODU0MzE2NX0.uQMS9M6hF_cBboAJiZ-8_wiLuLHtkPmTTl1eeVx1elY
```

### 4. Deploy
- Clica em "Deploy"
- Aguarda 1-2 minutos
- Recebes um URL tipo: `https://shopify-batch-fetch.vercel.app`

### 5. Acesso
Acede ao URL fornecido de qualquer computador/telemóvel!

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

## Alternativa: Netlify

Se preferires usar Netlify:
1. https://app.netlify.com/start
2. Conecta ao GitHub
3. Seleciona o repositório
4. Adiciona as mesmas variáveis de ambiente
5. Deploy!
