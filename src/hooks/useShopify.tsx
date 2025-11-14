/**
 * useShopify Hook
 *
 * React hook for interacting with Shopify API
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createShopifyClient, FetchOrdersOptions, ShopifyOrder } from '@/lib/shopify-client';
import { transformOrdersForDatabase, withRetry } from '@/lib/shopify-utils';
import { logger } from '@/lib/logger';
import { useToast } from './use-toast';

interface ShopifyConfig {
  shop_url: string;
  access_token: string;
  is_active: boolean;
}

export function useShopify() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /**
   * Load Shopify configuration from database
   */
  const loadConfig = useCallback(async (): Promise<ShopifyConfig | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('shopify_config')
        .select('shop_url, access_token, is_active')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error loading Shopify config', error);
      return null;
    }
  }, [user]);

  /**
   * Test Shopify connection
   */
  const testConnection = useCallback(async (
    shopUrl: string,
    accessToken: string
  ): Promise<{ success: boolean; shopName?: string; error?: string }> => {
    setLoading(true);

    try {
      const client = createShopifyClient({
        shop_url: shopUrl,
        access_token: accessToken,
      });

      const result = await withRetry(
        () => client.testConnection(),
        { retries: 2, delay: 1000 }
      );

      if (result.success) {
        return {
          success: true,
          shopName: result.shop?.name,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Connection failed',
        };
      }
    } catch (error) {
      logger.error('Error testing Shopify connection', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sync orders from Shopify to database
   */
  const syncOrders = useCallback(async (
    options: FetchOrdersOptions = {}
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!user) {
      return { success: false, count: 0, error: 'User not authenticated' };
    }

    setSyncing(true);

    try {
      // Load config
      const config = await loadConfig();
      if (!config) {
        throw new Error('Shopify configuration not found');
      }

      // Create client
      const client = createShopifyClient(config);

      // Fetch orders
      logger.info('Fetching orders from Shopify');
      const orders = await withRetry(
        () => client.fetchOrders(options),
        { retries: 3, delay: 2000 }
      );

      if (orders.length === 0) {
        toast({
          title: 'Nenhuma encomenda encontrada',
          description: 'Não foram encontradas novas encomendas.',
        });
        return { success: true, count: 0 };
      }

      // Transform orders
      const dbOrders = transformOrdersForDatabase(orders, user.id);

      // Save to database (upsert)
      logger.info(`Saving ${dbOrders.length} orders to database`);
      const { error: insertError } = await supabase
        .from('orders')
        .upsert(dbOrders, {
          onConflict: 'user_id,shopify_order_id',
        });

      if (insertError) throw insertError;

      // Update last_sync timestamp
      await supabase
        .from('shopify_config')
        .update({ last_sync: new Date().toISOString() })
        .eq('user_id', user.id);

      // Create automation log
      await supabase.from('automation_logs').insert({
        user_id: user.id,
        orders_fetched: dbOrders.length,
        status: 'success',
        message: `Successfully synced ${dbOrders.length} orders`,
      });

      toast({
        title: 'Sincronização concluída!',
        description: `${dbOrders.length} encomendas sincronizadas com sucesso.`,
      });

      return { success: true, count: dbOrders.length };
    } catch (error) {
      logger.error('Error syncing orders', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Create error log
      if (user) {
        await supabase.from('automation_logs').insert({
          user_id: user.id,
          orders_fetched: 0,
          status: 'error',
          message: `Sync failed: ${errorMessage}`,
        });
      }

      toast({
        title: 'Erro na sincronização',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, count: 0, error: errorMessage };
    } finally {
      setSyncing(false);
    }
  }, [user, loadConfig, toast]);

  /**
   * Get order count from Shopify
   */
  const getOrderCount = useCallback(async (): Promise<number | null> => {
    if (!user) return null;

    try {
      const config = await loadConfig();
      if (!config) return null;

      const client = createShopifyClient(config);
      const count = await client.getOrderCount();

      return count;
    } catch (error) {
      logger.error('Error getting order count', error);
      return null;
    }
  }, [user, loadConfig]);

  return {
    loading,
    syncing,
    testConnection,
    syncOrders,
    getOrderCount,
    loadConfig,
  };
}
