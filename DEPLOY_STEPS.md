# Guia de Deploy - Correção Duplicate Key + Integração Shopify

Este guia resolve o erro `duplicate key value violates unique constraint "shopify_config_user_id_key"` e implementa a integração completa com o Shopify.

## ✅ O que foi implementado

1. **Migration SQL** - Corrige a constraint duplicada no banco de dados
2. **Edge Function save-config** - Guardar configurações com UPSERT correto
3. **Edge Function get-config** - Carregar configurações do utilizador
4. **Frontend atualizado** - Usa Edge Functions em vez de acesso direto ao DB

---

## 🚀 Passo a Passo para Deploy

### 1️⃣ Aplicar Migration no Supabase (OBRIGATÓRIO)

**Opção A - Via Terminal (recomendado):**
```bash
# 1. Fazer pull do código
git pull origin claude/deploy-edge-function-shopify-01A9eqcKZ2meZnSuS5yHheyc

# 2. Aplicar migration
supabase db push
```

**Opção B - Via Dashboard:**
1. Acede: https://supabase.com/dashboard/project/hzdmqymvvhdesmcexdgl/sql
2. Clica em "New query"
3. Cola o conteúdo do arquivo: `supabase/migrations/20251118000000_fix_duplicate_key_constraint.sql`
4. Clica em "Run"

### 2️⃣ Deploy das Edge Functions (OBRIGATÓRIO)

```bash
# Deploy de todas as functions necessárias
supabase functions deploy save-config
supabase functions deploy get-config
supabase functions deploy fetch-shopify-orders
```

**Verificar se foram criadas:**
```bash
supabase functions list
```

Deves ver:
- ✅ save-config
- ✅ get-config
- ✅ fetch-shopify-orders

### 3️⃣ Re-deploy do Frontend no Netlify

**Opção A - Automático (GitHub):**
O Netlify faz deploy automático quando há push no repositório.

**Opção B - Manual:**
1. Acede: https://app.netlify.com
2. Vai ao site `shopify-batch-fetch`
3. Clica em "Trigger deploy" → "Deploy site"

### 4️⃣ Limpar Cache do Browser

Depois do deploy do frontend:
1. Abre a aplicação: https://691c95b41f67638afc3dac64--shopify-batch-fetch.netlify.app/
2. Faz **hard refresh**:
   - Chrome/Edge: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
   - Firefox: `Ctrl + F5` (Windows) ou `Cmd + Shift + R` (Mac)

---

## 🧪 Testar Tudo

### 1. Criar conta / Fazer login
```
URL: https://691c95b41f67638afc3dac64--shopify-batch-fetch.netlify.app/auth
Email: teste@email.com
Password: 123456 (mínimo 6 caracteres)
```

### 2. Ir a Configurações
- Clica em "Configurações" no menu lateral (ícone ⚙️)

### 3. Preencher dados do Shopify
```
URL da Loja: tua-loja.myshopify.com
Access Token: shpss_xxxxxxxxxxxxxxxxxxxxx
```

### 4. Selecionar campos
- Marca os checkboxes dos campos que queres extrair
- Por defeito já vêm marcados:
  - ✅ Produtos da encomenda (line items)
  - ✅ Estado de fulfillment
  - ✅ Estado financeiro

### 5. Guardar configurações
- Clica em "Guardar Configurações"
- Deves ver: ✅ "Configurações guardadas"

### 6. Testar conexão
- Clica em "Testar Conexão e Buscar Encomendas"
- Deves ver: ✅ "Conexão bem-sucedida! Buscámos X encomendas..."

### 7. Ver resultados
- Vai a "Encomendas" no menu lateral
- Deves ver as encomendas importadas do Shopify
- Vai a "Logs" para ver histórico de sincronizações

---

## ❗ Troubleshooting

### Erro: "duplicate key value violates..."
**Solução:** Aplica a migration (Passo 1)

### Erro: "function not found: save-config"
**Solução:** Faz deploy das Edge Functions (Passo 2)

### Configurações não aparecem depois de guardar
**Solução:**
1. Verifica se as Edge Functions foram deployed
2. Limpa cache do browser
3. Faz refresh na página

### Botão "Testar Conexão" não funciona
**Solução:**
1. Verifica se `fetch-shopify-orders` foi deployed
2. Confirma que guardaste as configurações primeiro
3. Verifica se os dados do Shopify estão corretos

---

## 📋 Checklist Final

Depois de executar todos os passos, confirma:

- [ ] Migration aplicada no Supabase (sem erros)
- [ ] 3 Edge Functions deployed (save-config, get-config, fetch-shopify-orders)
- [ ] Frontend re-deployed no Netlify
- [ ] Login funciona
- [ ] Consegues guardar configurações do Shopify
- [ ] Botão "Guardar Configurações" funciona (sem erros)
- [ ] Botão "Testar Conexão" busca encomendas com sucesso
- [ ] Encomendas aparecem na página "Encomendas"
- [ ] Logs aparecem na página "Logs"

---

## 🎉 Tudo a funcionar!

Se todos os itens acima estão ✅, a integração está completa e a funcionar!

Podes agora:
- Guardar configurações sem erros de duplicate key
- Conectar à loja Shopify dev
- Extrair encomendas automaticamente
- Selecionar campos personalizados
- Ver histórico de sincronizações

---

## 💡 Próximos Passos (Opcional)

1. **Automação periódica** - Configurar Cron Job para sincronizar de X em X tempo
2. **Webhooks do Shopify** - Receber notificações em tempo real de novas encomendas
3. **Múltiplas lojas** - Suporte para conectar várias lojas Shopify
4. **Exportar dados** - Download de encomendas em CSV/Excel
