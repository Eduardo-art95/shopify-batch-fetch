import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ShopifyProxyRequest {
  shop_url: string;
  access_token: string;
  endpoint: string;
  method?: string;
  body?: unknown;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop_url, access_token, endpoint, method = "GET", body }: ShopifyProxyRequest = await req.json();

    if (!shop_url || !access_token || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: shop_url, access_token, endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize shop URL
    let normalizedShopUrl = shop_url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!normalizedShopUrl.includes(".")) {
      normalizedShopUrl = `${normalizedShopUrl}.myshopify.com`;
    }

    const apiVersion = "2024-01";
    const shopifyUrl = `https://${normalizedShopUrl}/admin/api/${apiVersion}${endpoint}`;

    console.log(`Proxying request to: ${shopifyUrl}`);

    const shopifyResponse = await fetch(shopifyUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": access_token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await shopifyResponse.json();

    if (!shopifyResponse.ok) {
      console.error("Shopify API error:", responseData);
      return new Response(
        JSON.stringify({
          error: "Shopify API error",
          status: shopifyResponse.status,
          details: responseData,
        }),
        {
          status: shopifyResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
