// Shopify API Types
// Based on Shopify Admin REST API 2024-01

export interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface ShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  phone: string | null;
  company: string | null;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  variant_title: string | null;
  product_id: number | null;
  variant_id: number | null;
}

export interface ShopifyOrder {
  id: number;
  name: string; // Order number like "#1001"
  order_number: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  currency: string;
  customer: ShopifyCustomer | null;
  billing_address: ShopifyAddress | null;
  shipping_address: ShopifyAddress | null;
  line_items: ShopifyLineItem[];
  note: string | null;
  tags: string;
  email: string | null;
  phone: string | null;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

export interface ShopifyCountResponse {
  count: number;
}

export interface ShopifyConfig {
  shopUrl: string;
  accessToken: string;
  apiVersion?: string;
}

export interface FetchOrdersOptions {
  limit?: number;
  since_id?: number;
  created_at_min?: string;
  created_at_max?: string;
  status?: "open" | "closed" | "cancelled" | "any";
  financial_status?: string;
  fulfillment_status?: string;
}

export interface ShopifyApiError {
  errors: string | Record<string, string[]>;
}

export interface BatchFetchResult {
  success: boolean;
  orders: ShopifyOrder[];
  totalFetched: number;
  hasMore: boolean;
  error?: string;
}
