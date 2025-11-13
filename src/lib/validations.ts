import { z } from 'zod';

// Auth validation schemas
export const authSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
});

// Shopify configuration validation schemas
export const shopifyConfigSchema = z.object({
  shop_url: z
    .string()
    .min(1, 'URL da loja é obrigatório')
    .regex(
      /^[a-z0-9-]+\.myshopify\.com$/i,
      'URL deve estar no formato: sualojas.myshopify.com'
    )
    .transform((val) => val.toLowerCase()),
  access_token: z
    .string()
    .min(1, 'Access token é obrigatório')
    .regex(
      /^shp(at|ca|pa|ss)_[a-fA-F0-9]{32}$/,
      'Token do Shopify inválido. Deve começar com shpat_, shpca_, shppa_ ou shpss_'
    ),
  trigger_order_count: z
    .number()
    .int('Deve ser um número inteiro')
    .positive('Deve ser um número positivo')
    .min(1, 'Mínimo de 1 encomenda')
    .max(1000, 'Máximo de 1000 encomendas'),
  is_active: z.boolean(),
});

// Type exports for TypeScript
export type AuthFormData = z.infer<typeof authSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ShopifyConfigFormData = z.infer<typeof shopifyConfigSchema>;
