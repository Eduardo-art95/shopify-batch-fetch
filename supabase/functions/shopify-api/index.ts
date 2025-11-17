import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user token and get user ID
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, params } = await req.json()

    // Get user's Shopify config
    const { data: config, error: configError } = await supabase
      .from('shopify_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Shopify configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!config.access_token || !config.shop_url) {
      return new Response(
        JSON.stringify({ error: 'Shopify not connected. Please connect your store first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const shopDomain = config.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const accessToken = config.access_token

    let result

    switch (action) {
      case 'fetch_orders': {
        // Fetch orders from Shopify
        const limit = params?.limit || 50
        const sinceId = params?.since_id || null
        const status = params?.status || 'any'

        let url = `https://${shopDomain}/admin/api/2024-01/orders.json?limit=${limit}&status=${status}`
        if (sinceId) {
          url += `&since_id=${sinceId}`
        }

        const ordersResponse = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        })

        if (!ordersResponse.ok) {
          const errorText = await ordersResponse.text()
          console.error('Shopify API error:', errorText)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch orders from Shopify', details: errorText }),
            { status: ordersResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const ordersData = await ordersResponse.json()
        result = ordersData.orders

        // Store orders in database
        if (result && result.length > 0) {
          const ordersToInsert = result.map((order: any) => ({
            user_id: user.id,
            shopify_order_id: order.id.toString(),
            order_number: order.name || order.order_number?.toString(),
            customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 'Guest',
            customer_email: order.customer?.email || order.email || '',
            total_price: parseFloat(order.total_price),
            currency: order.currency,
            status: order.financial_status || order.fulfillment_status || 'pending',
            shopify_created_at: order.created_at,
          }))

          // Upsert orders (ignore duplicates)
          const { error: insertError } = await supabase
            .from('orders')
            .upsert(ordersToInsert, {
              onConflict: 'user_id,shopify_order_id',
              ignoreDuplicates: true
            })

          if (insertError) {
            console.error('Error inserting orders:', insertError)
          }

          // Log the automation run
          await supabase.from('automation_logs').insert({
            user_id: user.id,
            orders_fetched: result.length,
            status: 'success',
            message: `Successfully fetched ${result.length} orders from Shopify`,
          })

          // Update last_sync
          await supabase
            .from('shopify_config')
            .update({ last_sync: new Date().toISOString() })
            .eq('user_id', user.id)
        }

        break
      }

      case 'get_shop_info': {
        // Get shop information
        const shopResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        })

        if (!shopResponse.ok) {
          const errorText = await shopResponse.text()
          return new Response(
            JSON.stringify({ error: 'Failed to fetch shop info', details: errorText }),
            { status: shopResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const shopData = await shopResponse.json()
        result = shopData.shop
        break
      }

      case 'get_orders_count': {
        // Get total orders count
        const countResponse = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/count.json?status=any`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        })

        if (!countResponse.ok) {
          const errorText = await countResponse.text()
          return new Response(
            JSON.stringify({ error: 'Failed to fetch orders count', details: errorText }),
            { status: countResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const countData = await countResponse.json()
        result = countData
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
