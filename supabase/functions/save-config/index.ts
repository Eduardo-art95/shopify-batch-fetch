import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
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

    console.log(`Saving config for user: ${user.id}`)

    // Get data from request body
    const configData = await req.json()

    // Basic validations
    if (!configData.shop_url || !configData.access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'URL da loja e Access Token são obrigatórios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract shop_domain from URL
    const shopDomain = configData.shop_url
      .replace(/https?:\/\//, '')
      .replace(/\/$/, '')
      .trim()

    // Prepare data to save
    const configToSave = {
      user_id: user.id,
      shop_domain: shopDomain,
      shop_url: configData.shop_url.trim(),
      access_token: configData.access_token.trim(),
      selected_fields: configData.selected_fields || {},
      trigger_order_count: configData.trigger_order_count || 10,
      is_active: configData.is_active ?? false,
    }

    console.log('Saving configuration:', { ...configToSave, access_token: '***' })

    // UPSERT: update if exists, create if not
    const { data, error } = await supabase
      .from('shopify_config')
      .upsert(configToSave, {
        onConflict: 'user_id,shop_domain',
        ignoreDuplicates: false, // Always update
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error saving configuration:', error)
      throw error
    }

    console.log('Configuration saved successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: 'Configuração guardada com sucesso!'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in save-config function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar pedido',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
