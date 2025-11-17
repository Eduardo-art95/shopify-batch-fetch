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
    const { code, shop, userId } = await req.json()

    if (!code || !shop || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code, shop, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Shopify credentials from environment
    const clientId = Deno.env.get('SHOPIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('Missing Shopify credentials in environment')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean shop URL
    const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Shopify token exchange failed:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange code for token', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const scope = tokenData.scope

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token received from Shopify' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store the access token in the database
    const { error: dbError } = await supabase
      .from('shopify_config')
      .upsert({
        user_id: userId,
        shop_url: shopDomain,
        access_token: accessToken,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to save configuration', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        shop: shopDomain,
        scope: scope,
        message: 'Shopify store connected successfully'
      }),
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
