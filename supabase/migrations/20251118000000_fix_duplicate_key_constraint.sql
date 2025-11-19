-- Migration para corrigir problema de duplicate key e permitir múltiplas lojas

-- Passo 1: Limpar dados duplicados (manter apenas o mais recente por utilizador)
DELETE FROM shopify_config
WHERE id NOT IN (
  SELECT MAX(id)
  FROM shopify_config
  GROUP BY user_id
);

-- Passo 2: Verificar se a coluna shop_domain existe, se não criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_config' AND column_name = 'shop_domain'
  ) THEN
    ALTER TABLE shopify_config ADD COLUMN shop_domain TEXT;
  END IF;
END $$;

-- Passo 3: Extrair shop_domain dos URLs existentes (se houver dados)
UPDATE shopify_config
SET shop_domain = REGEXP_REPLACE(shop_url, 'https?://', '')
WHERE shop_domain IS NULL AND shop_url IS NOT NULL;

-- Passo 4: Remover a constraint antiga que causa o erro
ALTER TABLE shopify_config
DROP CONSTRAINT IF EXISTS shopify_config_user_id_key;

-- Passo 5: Adicionar nova constraint (permite múltiplas lojas por user)
ALTER TABLE shopify_config
ADD CONSTRAINT shopify_config_user_shop_unique
UNIQUE (user_id, shop_domain);

-- Passo 6: Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_shopify_config_user
ON shopify_config(user_id);

CREATE INDEX IF NOT EXISTS idx_shopify_config_active
ON shopify_config(is_active)
WHERE is_active = true;

-- Passo 7: Garantir que updated_at existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_config' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE shopify_config ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Passo 8: Criar/Atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shopify_config_updated_at ON shopify_config;

CREATE TRIGGER update_shopify_config_updated_at
BEFORE UPDATE ON shopify_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON COLUMN shopify_config.shop_domain IS 'Domain da loja Shopify (ex: minhaloja.myshopify.com)';
COMMENT ON CONSTRAINT shopify_config_user_shop_unique ON shopify_config IS 'Um utilizador pode ter múltiplas lojas, mas não pode duplicar a mesma loja';
