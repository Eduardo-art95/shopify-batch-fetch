// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShopifyOrder {
  id: number
  name: string
  email: string
  created_at: string
  total_price: string
  currency: string
  financial_status: string
  customer: {
    first_name: string
    last_name: string
    email: string
  } | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's Shopify config
    const { data: config, error: configError } = await supabaseClient
      .from('shopify_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      throw new Error('Shopify configuration not found')
    }

    if (!config.shop_url || !config.access_token) {
      throw new Error('Shopify credentials not configured')
    }

    // Get request parameters
    const { since_id, limit = 50 } = await req.json().catch(() => ({}))

    // Build query parameters
    const params = new URLSearchParams({
      limit: Math.min(limit, 250).toString(),
      status: 'any',
    })

    if (since_id) {
      params.append('since_id', since_id)
    }

    if (config.last_sync) {
      params.append('created_at_min', config.last_sync)
    }

    // Create automation log entry
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('automation_logs')
      .insert({
        user_id: user.id,
        status: 'running',
        message: 'A buscar encomendas do Shopify...',
        orders_fetched: 0,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating log:', logError)
    }

    // Fetch orders from Shopify
    const shopifyResponse = await fetch(
      `https://${config.shop_url}/admin/api/2024-01/orders.json?${params}`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!shopifyResponse.ok) {
      const errorMessage = `Erro ao buscar encomendas: ${shopifyResponse.status} ${shopifyResponse.statusText}`

      // Update log with error
      if (logEntry) {
        await supabaseAdmin
          .from('automation_logs')
          .update({
            status: 'error',
            message: errorMessage,
          })
          .eq('id', logEntry.id)
      }

      throw new Error(errorMessage)
    }

    const { orders } = await shopifyResponse.json() as { orders: ShopifyOrder[] }

    // Store orders in database
    const ordersToInsert = orders.map((order: ShopifyOrder) => ({
      user_id: user.id,
      shopify_order_id: order.id.toString(),
      order_number: order.name,
      customer_name: order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
        : null,
      customer_email: order.customer?.email || order.email,
      total_price: parseFloat(order.total_price),
      currency: order.currency,
      status: order.financial_status,
      shopify_created_at: order.created_at,
    }))

    if (ordersToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('orders')
        .upsert(ordersToInsert, {
          onConflict: 'shopify_order_id,user_id',
        })

      if (insertError) {
        console.error('Error inserting orders:', insertError)
        throw new Error('Erro ao guardar encomendas na base de dados')
      }
    }

    // Update last_sync timestamp
    await supabaseAdmin
      .from('shopify_config')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', user.id)

    // Update log with success
    if (logEntry) {
      await supabaseAdmin
        .from('automation_logs')
        .update({
          status: 'success',
          message: `${ordersToInsert.length} encomendas sincronizadas com sucesso`,
          orders_fetched: ordersToInsert.length,
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        orders_fetched: ordersToInsert.length,
        message: `${ordersToInsert.length} encomendas sincronizadas com sucesso`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'server_error',
        message: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
