// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

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
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
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

    // Get request body
    const { shop_url, access_token } = await req.json()

    if (!shop_url || !access_token) {
      throw new Error('shop_url and access_token are required')
    }

    // Clean shop URL
    let cleanUrl = shop_url.trim().toLowerCase()
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '')
    cleanUrl = cleanUrl.replace(/\/$/, '')

    // Test connection to Shopify API
    const shopifyResponse = await fetch(`https://${cleanUrl}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': access_token.trim(),
        'Content-Type': 'application/json',
      },
    })

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.text()

      if (shopifyResponse.status === 401) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'invalid_token',
            message: 'Access Token inválido ou sem permissões. Verifique se o token está correto e tem permissão de leitura.',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (shopifyResponse.status === 403) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'access_denied',
            message: 'Acesso negado. Verifique as permissões da aplicação no Shopify.',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (shopifyResponse.status === 404) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'store_not_found',
            message: 'Loja não encontrada. Verifique se o URL está correto.',
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'shopify_error',
          message: `Erro ${shopifyResponse.status}: ${shopifyResponse.statusText}`,
          details: errorData,
        }),
        {
          status: shopifyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const shopData = await shopifyResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        shop: {
          name: shopData.shop.name,
          email: shopData.shop.email,
          domain: shopData.shop.domain,
          myshopify_domain: shopData.shop.myshopify_domain,
          plan_name: shopData.shop.plan_name,
          currency: shopData.shop.currency,
        },
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
