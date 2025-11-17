import {
  ShopifyConfig,
  ShopifyOrder,
  ShopifyOrdersResponse,
  ShopifyCountResponse,
  FetchOrdersOptions,
  BatchFetchResult,
  ShopifyApiError,
} from "./types";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || "2024-01";

export class ShopifyClient {
  private shopUrl: string;
  private accessToken: string;
  private apiVersion: string;
  private useProxy: boolean;

  constructor(config: ShopifyConfig & { useProxy?: boolean }) {
    this.shopUrl = this.normalizeShopUrl(config.shopUrl);
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.useProxy = config.useProxy !== false; // Default to using proxy
  }

  private normalizeShopUrl(url: string): string {
    // Remove protocol if present
    let normalized = url.replace(/^https?:\/\//, "");
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, "");
    // Ensure it ends with .myshopify.com if it doesn't have a domain
    if (!normalized.includes(".")) {
      normalized = `${normalized}.myshopify.com`;
    }
    return normalized;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.useProxy) {
      return this.requestViaProxy<T>(endpoint, options);
    }
    return this.requestDirect<T>(endpoint, options);
  }

  private async requestViaProxy<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke("shopify-proxy", {
      body: {
        shop_url: this.shopUrl,
        access_token: this.accessToken,
        endpoint,
        method: options.method || "GET",
        body: options.body ? JSON.parse(options.body as string) : undefined,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to call Shopify proxy");
    }

    if (data.error) {
      const errorDetails = data.details;
      let errorMessage = data.error;

      if (errorDetails?.errors) {
        if (typeof errorDetails.errors === "string") {
          errorMessage = errorDetails.errors;
        } else if (typeof errorDetails.errors === "object") {
          errorMessage = Object.entries(errorDetails.errors)
            .map(([key, messages]) => `${key}: ${(messages as string[]).join(", ")}`)
            .join("; ");
        }
      }

      throw new Error(errorMessage);
    }

    return data as T;
  }

  private async requestDirect<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = `https://${this.shopUrl}/admin/api/${this.apiVersion}`;
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = (await response.json()) as ShopifyApiError;
        if (typeof errorData.errors === "string") {
          errorMessage = errorData.errors;
        } else if (typeof errorData.errors === "object") {
          errorMessage = Object.entries(errorData.errors)
            .map(([key, messages]) => `${key}: ${messages.join(", ")}`)
            .join("; ");
        }
      } catch {
        // Use default error message if parsing fails
      }

      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async getOrdersCount(options: FetchOrdersOptions = {}): Promise<number> {
    const params = new URLSearchParams();

    if (options.status) params.append("status", options.status);
    if (options.financial_status) params.append("financial_status", options.financial_status);
    if (options.fulfillment_status) params.append("fulfillment_status", options.fulfillment_status);
    if (options.created_at_min) params.append("created_at_min", options.created_at_min);
    if (options.created_at_max) params.append("created_at_max", options.created_at_max);

    const queryString = params.toString();
    const endpoint = `/orders/count.json${queryString ? `?${queryString}` : ""}`;

    const response = await this.request<ShopifyCountResponse>(endpoint);
    return response.count;
  }

  async getOrders(options: FetchOrdersOptions = {}): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams();

    params.append("limit", String(options.limit || 50));
    if (options.since_id) params.append("since_id", String(options.since_id));
    if (options.status) params.append("status", options.status);
    if (options.financial_status) params.append("financial_status", options.financial_status);
    if (options.fulfillment_status) params.append("fulfillment_status", options.fulfillment_status);
    if (options.created_at_min) params.append("created_at_min", options.created_at_min);
    if (options.created_at_max) params.append("created_at_max", options.created_at_max);

    const endpoint = `/orders.json?${params.toString()}`;
    const response = await this.request<ShopifyOrdersResponse>(endpoint);
    return response.orders;
  }

  async fetchAllOrders(options: FetchOrdersOptions = {}): Promise<BatchFetchResult> {
    const allOrders: ShopifyOrder[] = [];
    let hasMore = true;
    let sinceId: number | undefined = options.since_id;
    const limit = options.limit || 250; // Max allowed by Shopify

    try {
      while (hasMore) {
        const orders = await this.getOrders({
          ...options,
          limit,
          since_id: sinceId,
        });

        if (orders.length === 0) {
          hasMore = false;
        } else {
          allOrders.push(...orders);
          sinceId = orders[orders.length - 1].id;
          hasMore = orders.length === limit;
        }

        // Rate limiting: Shopify allows 2 requests per second
        if (hasMore) {
          await this.delay(500);
        }
      }

      return {
        success: true,
        orders: allOrders,
        totalFetched: allOrders.length,
        hasMore: false,
      };
    } catch (error) {
      return {
        success: false,
        orders: allOrders,
        totalFetched: allOrders.length,
        hasMore: true,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async verifyConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.getOrdersCount({ status: "any" });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Connection verification failed",
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getShopUrl(): string {
    return this.shopUrl;
  }

  getApiVersion(): string {
    return this.apiVersion;
  }
}

export function createShopifyClient(config: ShopifyConfig): ShopifyClient {
  return new ShopifyClient(config);
}
