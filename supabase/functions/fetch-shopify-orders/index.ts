import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShopifyOrder {
  id: number
  order_number: number
  customer?: {
    first_name?: string
    last_name?: string
    email?: string
  }
  total_price: string
  currency: string
  financial_status: string
  created_at: string
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
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log(`Fetching orders for user: ${user.id}`)

    // Get Shopify configuration for the user
    const { data: config, error: configError } = await supabase
      .from('shopify_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      throw new Error('Shopify configuration not found. Please configure your store first.')
    }

    if (!config.is_active) {
      throw new Error('Shopify integration is not active. Please activate it in settings.')
    }

    console.log(`Fetching orders from: ${config.shop_url}`)

    // Fetch orders from Shopify API
    const shopifyUrl = `https://${config.shop_url}/admin/api/2024-01/orders.json?status=any&limit=${config.trigger_order_count}`

    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': config.access_token,
        'Content-Type': 'application/json',
      },
    })

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text()
      console.error('Shopify API error:', errorText)
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`)
    }

    const shopifyData = await shopifyResponse.json()
    const orders: ShopifyOrder[] = shopifyData.orders || []

    console.log(`Fetched ${orders.length} orders from Shopify`)

    // Process and save orders to database
    let savedCount = 0
    const selectedFields = config.selected_fields || {}

    for (const order of orders) {
      const customerName = order.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        : 'Guest'

      // Build extra_fields object based on selected fields
      const extraFields: any = {}

      if (selectedFields.customer_phone && order.customer?.phone) {
        extraFields.customer_phone = order.customer.phone
      }

      if (selectedFields.billing_address && order.billing_address) {
        extraFields.billing_address = order.billing_address
      }

      if (selectedFields.shipping_address && order.shipping_address) {
        extraFields.shipping_address = order.shipping_address
      }

      if (selectedFields.line_items && order.line_items) {
        extraFields.line_items = order.line_items
      }

      if (selectedFields.fulfillment_status) {
        extraFields.fulfillment_status = order.fulfillment_status
      }

      if (selectedFields.financial_status) {
        extraFields.financial_status = order.financial_status
      }

      if (selectedFields.tags && order.tags) {
        extraFields.tags = order.tags
      }

      if (selectedFields.note && order.note) {
        extraFields.note = order.note
      }

      if (selectedFields.discount_codes && order.discount_codes) {
        extraFields.discount_codes = order.discount_codes
      }

      if (selectedFields.shipping_lines && order.shipping_lines) {
        extraFields.shipping_lines = order.shipping_lines
      }

      if (selectedFields.tax_lines && order.tax_lines) {
        extraFields.tax_lines = order.tax_lines
      }

      if (selectedFields.subtotal_price && order.subtotal_price) {
        extraFields.subtotal_price = order.subtotal_price
      }

      if (selectedFields.total_tax && order.total_tax) {
        extraFields.total_tax = order.total_tax
      }

      if (selectedFields.total_discounts && order.total_discounts) {
        extraFields.total_discounts = order.total_discounts
      }

      // Extract tracking info from fulfillments
      if ((selectedFields.tracking_number || selectedFields.tracking_company) && order.fulfillments) {
        const trackingInfo: any = {}
        order.fulfillments.forEach((fulfillment: any) => {
          if (selectedFields.tracking_number && fulfillment.tracking_number) {
            if (!trackingInfo.tracking_numbers) trackingInfo.tracking_numbers = []
            trackingInfo.tracking_numbers.push(fulfillment.tracking_number)
          }
          if (selectedFields.tracking_company && fulfillment.tracking_company) {
            if (!trackingInfo.tracking_companies) trackingInfo.tracking_companies = []
            trackingInfo.tracking_companies.push(fulfillment.tracking_company)
          }
        })
        if (Object.keys(trackingInfo).length > 0) {
          extraFields.tracking = trackingInfo
        }
      }

      const { error: insertError } = await supabase
        .from('orders')
        .upsert({
          user_id: user.id,
          shopify_order_id: order.id.toString(),
          order_number: order.order_number.toString(),
          customer_name: customerName,
          customer_email: order.customer?.email || null,
          total_price: parseFloat(order.total_price),
          currency: order.currency,
          status: order.financial_status,
          shopify_created_at: order.created_at,
          extra_fields: extraFields
        }, {
          onConflict: 'user_id,shopify_order_id',
          ignoreDuplicates: false
        })

      if (!insertError) {
        savedCount++
      } else {
        console.error(`Error saving order ${order.id}:`, insertError)
      }
    }

    // Update last sync time
    await supabase
      .from('shopify_config')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', user.id)

    // Log the automation execution
    const { error: logError } = await supabase
      .from('automation_logs')
      .insert({
        user_id: user.id,
        orders_fetched: savedCount,
        status: 'success',
        message: `Successfully fetched and saved ${savedCount} orders from Shopify`,
      })

    if (logError) {
      console.error('Error logging automation:', logError)
    }

    console.log(`Successfully saved ${savedCount} orders`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched ${orders.length} orders, saved ${savedCount}`,
        orders_fetched: orders.length,
        orders_saved: savedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in fetch-shopify-orders:', error)

    // Try to log the error if possible
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)

        if (user) {
          await supabase
            .from('automation_logs')
            .insert({
              user_id: user.id,
              orders_fetched: 0,
              status: 'error',
              message: error.message || 'Unknown error occurred',
            })
        }
      }
    } catch (logErr) {
      console.error('Error logging failure:', logErr)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
