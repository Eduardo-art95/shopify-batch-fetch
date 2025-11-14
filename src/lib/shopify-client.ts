/**
 * Shopify API Client
 *
 * This module provides a simple wrapper around Shopify REST API
 * for fetching orders and other resources.
 *
 * SECURITY NOTE: This runs on the client side. For production,
 * move sensitive operations to Supabase Edge Functions.
 */

import { logger } from './logger';

export interface ShopifyConfig {
  shop_url: string;
  access_token: string;
}

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id: string;
  order_number: number;
  name: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
}

export interface FetchOrdersOptions {
  limit?: number;
  status?: 'any' | 'open' | 'closed' | 'cancelled';
  created_at_min?: string;
  created_at_max?: string;
  updated_at_min?: string;
  updated_at_max?: string;
}

/**
 * Shopify API Client
 */
export class ShopifyClient {
  private shop_url: string;
  private access_token: string;
  private api_version: string = '2024-01';

  constructor(config: ShopifyConfig) {
    // Normalize shop URL
    this.shop_url = config.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.access_token = config.access_token;
  }

  /**
   * Get base API URL
   */
  private getBaseUrl(): string {
    return `https://${this.shop_url}/admin/api/${this.api_version}`;
  }

  /**
   * Make authenticated request to Shopify API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.access_token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Shopify API error', { status: response.status, errorText });
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const data = await this.request<{ shop: any }>('/shop.json');
      return { success: true, shop: data.shop };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch orders from Shopify
   */
  async fetchOrders(options: FetchOrdersOptions = {}): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams();

    // Set defaults
    params.append('limit', String(options.limit || 50));
    params.append('status', options.status || 'any');

    // Add optional filters
    if (options.created_at_min) params.append('created_at_min', options.created_at_min);
    if (options.created_at_max) params.append('created_at_max', options.created_at_max);
    if (options.updated_at_min) params.append('updated_at_min', options.updated_at_min);
    if (options.updated_at_max) params.append('updated_at_max', options.updated_at_max);

    const data = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?${params.toString()}`
    );

    return data.orders || [];
  }

  /**
   * Fetch a single order by ID
   */
  async fetchOrder(orderId: number): Promise<ShopifyOrder> {
    const data = await this.request<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`
    );
    return data.order;
  }

  /**
   * Get order count
   */
  async getOrderCount(options: Omit<FetchOrdersOptions, 'limit'> = {}): Promise<number> {
    const params = new URLSearchParams();
    params.append('status', options.status || 'any');

    if (options.created_at_min) params.append('created_at_min', options.created_at_min);
    if (options.created_at_max) params.append('created_at_max', options.created_at_max);
    if (options.updated_at_min) params.append('updated_at_min', options.updated_at_min);
    if (options.updated_at_max) params.append('updated_at_max', options.updated_at_max);

    const data = await this.request<{ count: number }>(
      `/orders/count.json?${params.toString()}`
    );

    return data.count;
  }
}

/**
 * Create Shopify client instance
 */
export function createShopifyClient(config: ShopifyConfig): ShopifyClient {
  return new ShopifyClient(config);
}
