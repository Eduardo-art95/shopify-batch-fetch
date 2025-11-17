import { supabase } from '@/integrations/supabase/client';

export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface ShopifyConfig {
  shop_url: string;
  access_token: string;
}

export interface SyncResult {
  success: boolean;
  ordersCount: number;
  message: string;
}

export const fetchShopifyOrders = async (
  config: ShopifyConfig,
  limit: number = 50
): Promise<ShopifyOrder[]> => {
  const shopDomain = config.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiUrl = `https://${shopDomain}/admin/api/2024-01/orders.json`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': config.access_token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Shopify: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.orders || [];
};

export const syncOrders = async (userId: string): Promise<SyncResult> => {
  // 1. Buscar configuração do Shopify
  const { data: configData, error: configError } = await supabase
    .from('shopify_config')
    .select('shop_url, access_token')
    .eq('user_id', userId)
    .single();

  if (configError || !configData) {
    throw new Error('Configuração do Shopify não encontrada');
  }

  if (!configData.shop_url || !configData.access_token) {
    throw new Error('URL da loja ou token de acesso não configurados');
  }

  // 2. Criar log de início
  const { data: logData, error: logError } = await supabase
    .from('automation_logs')
    .insert({
      user_id: userId,
      status: 'running',
      message: 'Iniciando sincronização de encomendas...',
    })
    .select()
    .single();

  if (logError) {
    console.error('Erro ao criar log:', logError);
  }

  try {
    // 3. Buscar encomendas do Shopify
    const orders = await fetchShopifyOrders({
      shop_url: configData.shop_url,
      access_token: configData.access_token,
    });

    // 4. Inserir/atualizar encomendas no banco
    let insertedCount = 0;
    for (const order of orders) {
      const customerName = order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : 'Cliente Desconhecido';
      const customerEmail = order.customer?.email || order.email || '';

      const { error: insertError } = await supabase.from('orders').upsert(
        {
          user_id: userId,
          shopify_order_id: order.id.toString(),
          order_number: order.name,
          customer_name: customerName,
          customer_email: customerEmail,
          total_price: parseFloat(order.total_price),
          currency: order.currency,
          status: order.financial_status,
          shopify_created_at: order.created_at,
        },
        {
          onConflict: 'user_id,shopify_order_id',
        }
      );

      if (!insertError) {
        insertedCount++;
      }
    }

    // 5. Atualizar log com sucesso
    if (logData) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'success',
          orders_fetched: insertedCount,
          message: `Sincronização concluída. ${insertedCount} encomendas processadas.`,
        })
        .eq('id', logData.id);
    }

    // 6. Atualizar timestamp de última sincronização
    await supabase
      .from('shopify_config')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', userId);

    return {
      success: true,
      ordersCount: insertedCount,
      message: `Sincronização concluída com sucesso! ${insertedCount} encomendas processadas.`,
    };
  } catch (error) {
    // Atualizar log com erro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    if (logData) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'error',
          orders_fetched: 0,
          message: `Erro na sincronização: ${errorMessage}`,
        })
        .eq('id', logData.id);
    }

    throw new Error(errorMessage);
  }
};
