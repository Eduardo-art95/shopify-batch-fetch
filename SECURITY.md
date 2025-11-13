# Considerações de Segurança

Este documento descreve as medidas de segurança implementadas e as recomendações futuras para o projeto Shopify Batch Fetch.

## 🔒 Medidas de Segurança Implementadas

### 1. Proteção de Credenciais
- ✅ Arquivo `.env` adicionado ao `.gitignore`
- ✅ Template `.env.example` criado para referência
- ⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` real

### 2. Validação de Entrada (Input Validation)
Todas as entradas de usuário são validadas usando schemas Zod:

- **Autenticação**:
  - Email: validação de formato válido
  - Senha (registro): mínimo 8 caracteres, deve conter maiúscula, minúscula e número
  - Senha (login): campo obrigatório

- **Configuração Shopify**:
  - URL da loja: formato `*.myshopify.com`
  - Access Token: formato válido (shpat_, shpca_, shppa_, shpss_)
  - Trigger count: número inteiro positivo entre 1-1000

### 3. TypeScript Strict Mode
- ✅ Modo strict habilitado para segurança de tipos
- ✅ `noUnusedLocals` e `noUnusedParameters` ativos
- ✅ `noFallthroughCasesInSwitch` ativo

### 4. Row Level Security (RLS)
O Supabase possui políticas RLS configuradas para:
- `profiles`: usuários só podem ver seu próprio perfil
- `shopify_config`: usuários só podem ver sua própria configuração
- `orders`: usuários só podem ver suas próprias encomendas
- `automation_logs`: usuários só podem ver seus próprios logs

## ⚠️ VULNERABILIDADES CRÍTICAS A CORRIGIR

### 1. Armazenamento de Access Tokens em Plaintext

**PROBLEMA CRÍTICO**: Os access tokens do Shopify são armazenados em texto plano no banco de dados.

**Risco**: Se o banco de dados for comprometido, todos os access tokens das lojas Shopify ficam expostos.

**Solução Recomendada**: Usar Supabase Vault para criptografia

#### Como Implementar Criptografia com Supabase Vault:

1. **Criar um Secret no Supabase Vault**:
```sql
-- Criar uma chave de criptografia
SELECT pgsodium.create_key(name => 'shopify_tokens');
```

2. **Modificar a tabela para usar criptografia**:
```sql
-- Adicionar coluna criptografada
ALTER TABLE shopify_config
  ADD COLUMN encrypted_access_token bytea;

-- Função para inserir token criptografado
CREATE OR REPLACE FUNCTION insert_encrypted_token(
  p_user_id uuid,
  p_shop_url text,
  p_access_token text,
  p_trigger_order_count integer,
  p_is_active boolean
) RETURNS void AS $$
BEGIN
  INSERT INTO shopify_config (
    user_id,
    shop_url,
    encrypted_access_token,
    trigger_order_count,
    is_active
  ) VALUES (
    p_user_id,
    p_shop_url,
    pgsodium.crypto_secretbox_encrypt(
      p_access_token::bytea,
      (SELECT id FROM pgsodium.key WHERE name = 'shopify_tokens')
    ),
    p_trigger_order_count,
    p_is_active
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    shop_url = EXCLUDED.shop_url,
    encrypted_access_token = EXCLUDED.encrypted_access_token,
    trigger_order_count = EXCLUDED.trigger_order_count,
    is_active = EXCLUDED.is_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para ler token descriptografado
CREATE OR REPLACE FUNCTION get_decrypted_token(p_user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT encode(
      pgsodium.crypto_secretbox_decrypt(
        encrypted_access_token,
        (SELECT id FROM pgsodium.key WHERE name = 'shopify_tokens')
      ),
      'escape'
    )
    FROM shopify_config
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Atualizar o código do cliente**:
```typescript
// Salvar token criptografado
const { error } = await supabase.rpc('insert_encrypted_token', {
  p_user_id: user.id,
  p_shop_url: config.shop_url,
  p_access_token: config.access_token,
  p_trigger_order_count: config.trigger_order_count,
  p_is_active: config.is_active
});

// Ler token descriptografado (apenas quando necessário)
const { data: token } = await supabase.rpc('get_decrypted_token', {
  p_user_id: user.id
});
```

**Status**: 🔴 NÃO IMPLEMENTADO (requer acesso ao Supabase Dashboard)

### 2. Logging em Produção

**PROBLEMA**: `console.error()` expõe detalhes de erros no console do navegador.

**Solução**: Implementar logging adequado que:
- Desabilita console.log/error em produção
- Usa um serviço de logging (ex: Sentry, LogRocket)
- Não expõe stack traces ao usuário

**Status**: ⚠️ PARCIALMENTE RESOLVIDO (console.error ainda presente)

## 🛡️ Boas Práticas de Segurança

### Para Desenvolvedores:

1. **Nunca commite credenciais**:
   - Sempre use `.env` para secrets
   - Verifique que `.env` está no `.gitignore`
   - Use `.env.example` como template

2. **Rotação de Credenciais**:
   - Se o `.env` foi exposto, IMEDIATAMENTE:
     - Rotacione as chaves no Supabase Dashboard
     - Rotacione access tokens do Shopify
     - Atualize `.env` local

3. **Validação de Entrada**:
   - SEMPRE valide inputs do usuário
   - Use os schemas Zod em `/src/lib/validations.ts`
   - Nunca confie em dados do cliente

4. **Princípio do Menor Privilégio**:
   - RLS policies devem ser o mais restritivas possível
   - Usuários só devem ver seus próprios dados
   - Não exponha funções admin ao cliente

### Para Deploy:

1. **Variáveis de Ambiente**:
   - Configure as variáveis no ambiente de produção
   - Nunca use valores hardcoded
   - Use secrets managers para produção

2. **HTTPS Obrigatório**:
   - SEMPRE use HTTPS em produção
   - Configure HSTS headers
   - Redirecione HTTP para HTTPS

3. **CSP Headers**:
   - Configure Content Security Policy
   - Previna XSS attacks
   - Restrinja sources de scripts

4. **Rate Limiting**:
   - Implemente rate limiting em endpoints críticos
   - Proteja contra brute force attacks
   - Use Supabase Rate Limiting ou middleware

## 📚 Recursos Adicionais

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Shopify API Security](https://shopify.dev/docs/apps/auth/oauth)

## 🚨 Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade de segurança, por favor:
1. **NÃO** abra uma issue pública
2. Entre em contato diretamente com os maintainers
3. Forneça detalhes sobre a vulnerabilidade
4. Aguarde resposta antes de divulgar publicamente

## ✅ Checklist de Segurança

Antes de fazer deploy em produção:

- [ ] Rotacionar todas as credenciais de desenvolvimento
- [ ] Configurar variáveis de ambiente em produção
- [ ] Implementar criptografia de tokens (Supabase Vault)
- [ ] Configurar rate limiting
- [ ] Habilitar HTTPS e HSTS
- [ ] Configurar CSP headers
- [ ] Implementar logging em produção (Sentry/LogRocket)
- [ ] Revisar todas as RLS policies
- [ ] Testar autenticação e autorização
- [ ] Fazer audit de dependências (npm audit)
- [ ] Configurar backups automáticos do banco de dados
- [ ] Implementar monitoramento e alertas
