import { supabase } from '@/integrations/supabase/client';

const SHOPIFY_CLIENT_ID = import.meta.env.VITE_SHOPIFY_CLIENT_ID;
const SHOPIFY_REDIRECT_URI = import.meta.env.VITE_SHOPIFY_REDIRECT_URI;
const SHOPIFY_SCOPES = import.meta.env.VITE_SHOPIFY_SCOPES || 'read_orders,read_customers';

export interface ShopifyOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  currency: string;
  status: string;
  shopify_created_at: string;
}

export interface ShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  plan_name: string;
  currency: string;
}

/**
 * Generate the OAuth authorization URL for Shopify
 */
export const generateAuthUrl = (shopDomain: string, state: string): string => {
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state: state,
  });

  return `https://${cleanDomain}/admin/oauth/authorize?${params.toString()}`;
};

/**
 * Exchange OAuth authorization code for access token
 */
export const exchangeCodeForToken = async (
  code: string,
  shop: string,
  userId: string
): Promise<{ success: boolean; shop?: string; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('shopify-oauth-callback', {
    body: { code, shop, userId },
  });

  if (error) {
    console.error('OAuth callback error:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'Unknown error' };
  }

  return { success: true, shop: data.shop };
};

/**
 * Fetch orders from Shopify via Edge Function
 */
export const fetchOrders = async (params?: {
  limit?: number;
  since_id?: string;
  status?: string;
}): Promise<{ success: boolean; data?: ShopifyOrder[]; error?: string }> => {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.functions.invoke('shopify-api', {
    body: { action: 'fetch_orders', params },
  });

  if (error) {
    console.error('Fetch orders error:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'Unknown error' };
  }

  return { success: true, data: data.data };
};

/**
 * Get shop information
 */
export const getShopInfo = async (): Promise<{ success: boolean; data?: ShopInfo; error?: string }> => {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.functions.invoke('shopify-api', {
    body: { action: 'get_shop_info' },
  });

  if (error) {
    console.error('Get shop info error:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'Unknown error' };
  }

  return { success: true, data: data.data };
};

/**
 * Get orders count from Shopify
 */
export const getOrdersCount = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.functions.invoke('shopify-api', {
    body: { action: 'get_orders_count' },
  });

  if (error) {
    console.error('Get orders count error:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'Unknown error' };
  }

  return { success: true, count: data.data.count };
};

/**
 * Generate a random state string for OAuth security
 */
export const generateState = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store OAuth state in session storage for validation
 */
export const storeOAuthState = (state: string, shopDomain: string): void => {
  sessionStorage.setItem('shopify_oauth_state', state);
  sessionStorage.setItem('shopify_shop_domain', shopDomain);
};

/**
 * Validate and retrieve OAuth state from session storage
 */
export const validateOAuthState = (state: string): { valid: boolean; shopDomain?: string } => {
  const storedState = sessionStorage.getItem('shopify_oauth_state');
  const shopDomain = sessionStorage.getItem('shopify_shop_domain');

  if (!storedState || storedState !== state) {
    return { valid: false };
  }

  // Clean up
  sessionStorage.removeItem('shopify_oauth_state');
  sessionStorage.removeItem('shopify_shop_domain');

  return { valid: true, shopDomain: shopDomain || undefined };
};
