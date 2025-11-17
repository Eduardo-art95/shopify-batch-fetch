import { supabase } from "@/integrations/supabase/client";
import { ShopifyClient } from "./client";
import { ShopifyOrder, FetchOrdersOptions, BatchFetchResult } from "./types";

export interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  newOrders: number;
  updatedOrders: number;
  error?: string;
}

export async function getShopifyConfigForUser(userId: string) {
  const { data, error } = await supabase
    .from("shopify_config")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Shopify configuration not found for user");
  }

  return data;
}

export function createClientFromConfig(config: {
  shop_url: string;
  access_token: string;
}): ShopifyClient {
  return new ShopifyClient({
    shopUrl: config.shop_url,
    accessToken: config.access_token,
  });
}

export async function syncOrdersToDatabase(
  userId: string,
  orders: ShopifyOrder[]
): Promise<SyncResult> {
  let newOrders = 0;
  const updatedOrders = 0;

  try {
    for (const order of orders) {
      const orderData = {
        user_id: userId,
        shopify_order_id: String(order.id),
        order_number: String(order.order_number),
        customer_name: order.customer
          ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
          : "Unknown Customer",
        customer_email: order.customer?.email || order.email || null,
        total_price: parseFloat(order.total_price),
        currency: order.currency,
        status: order.financial_status,
        shopify_created_at: order.created_at,
      };

      // Try to upsert (insert or update if exists)
      const { error } = await supabase.from("orders").upsert(orderData, {
        onConflict: "user_id,shopify_order_id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        continue;
      }

      // Check if it was new or updated (simplified - counts all as processed)
      newOrders++;
    }

    return {
      success: true,
      ordersProcessed: orders.length,
      newOrders,
      updatedOrders,
    };
  } catch (error) {
    return {
      success: false,
      ordersProcessed: 0,
      newOrders,
      updatedOrders,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    };
  }
}

export async function logAutomationRun(
  userId: string,
  ordersFetched: number,
  status: "success" | "error" | "warning",
  message: string
): Promise<void> {
  await supabase.from("automation_logs").insert({
    user_id: userId,
    orders_fetched: ordersFetched,
    status,
    message,
  });
}

export async function updateLastSync(userId: string): Promise<void> {
  await supabase
    .from("shopify_config")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function fetchAndSyncOrders(
  userId: string,
  options?: FetchOrdersOptions
): Promise<{
  fetchResult: BatchFetchResult;
  syncResult: SyncResult;
}> {
  // Get user's Shopify config
  const config = await getShopifyConfigForUser(userId);

  // Create client
  const client = createClientFromConfig(config);

  // Fetch orders from Shopify
  const fetchResult = await client.fetchAllOrders(options);

  if (!fetchResult.success && fetchResult.orders.length === 0) {
    await logAutomationRun(userId, 0, "error", fetchResult.error || "Failed to fetch orders");

    return {
      fetchResult,
      syncResult: {
        success: false,
        ordersProcessed: 0,
        newOrders: 0,
        updatedOrders: 0,
        error: fetchResult.error,
      },
    };
  }

  // Sync orders to database
  const syncResult = await syncOrdersToDatabase(userId, fetchResult.orders);

  // Log the automation run
  const status = syncResult.success ? "success" : "error";
  const message = syncResult.success
    ? `Successfully synced ${syncResult.ordersProcessed} orders`
    : syncResult.error || "Sync failed";

  await logAutomationRun(userId, fetchResult.totalFetched, status, message);

  // Update last sync timestamp
  if (syncResult.success) {
    await updateLastSync(userId);
  }

  return {
    fetchResult,
    syncResult,
  };
}

export async function verifyShopifyConnection(
  shopUrl: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; orderCount?: number }> {
  const client = new ShopifyClient({ shopUrl, accessToken });

  const verifyResult = await client.verifyConnection();

  if (!verifyResult.valid) {
    return verifyResult;
  }

  try {
    const count = await client.getOrdersCount({ status: "any" });
    return { valid: true, orderCount: count };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to get order count",
    };
  }
}
