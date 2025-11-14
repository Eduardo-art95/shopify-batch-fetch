/**
 * Shopify utility functions
 *
 * Helper functions for transforming and processing Shopify data
 */

import { ShopifyOrder } from './shopify-client';

export interface DatabaseOrder {
  user_id: string;
  shopify_order_id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total_price: number;
  currency: string;
  status: string | null;
  shopify_created_at: string;
}

/**
 * Transform Shopify order to database format
 */
export function transformOrderForDatabase(
  order: ShopifyOrder,
  userId: string
): DatabaseOrder {
  const customerName = order.customer
    ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
    : null;

  return {
    user_id: userId,
    shopify_order_id: String(order.id),
    order_number: order.name,
    customer_name: customerName || null,
    customer_email: order.customer?.email || null,
    total_price: parseFloat(order.total_price),
    currency: order.currency,
    status: order.fulfillment_status || order.financial_status,
    shopify_created_at: order.created_at,
  };
}

/**
 * Transform multiple orders for database
 */
export function transformOrdersForDatabase(
  orders: ShopifyOrder[],
  userId: string
): DatabaseOrder[] {
  return orders.map((order) => transformOrderForDatabase(order, userId));
}

/**
 * Format Shopify URL
 * Ensures URL is in correct format (without protocol, without trailing slash)
 */
export function formatShopifyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Validate Shopify access token format
 */
export function isValidShopifyToken(token: string): boolean {
  // Shopify tokens start with shpat_, shpca_, shppa_, or shpss_
  return /^shp(at|ca|pa|ss)_[a-fA-F0-9]{32}$/.test(token);
}

/**
 * Calculate date range for fetching orders
 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Retry logic wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;

  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < retries - 1) {
        const waitTime = delay * Math.pow(backoff, i);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
