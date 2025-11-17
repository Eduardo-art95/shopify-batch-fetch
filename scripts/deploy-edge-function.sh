#!/bin/bash

# Deploy Shopify Orders Edge Function to Supabase
# This script uses Supabase CLI to deploy the Edge Function

PROJECT_REF="hzdmqymvvhdesmcexdgl"

echo "🚀 Deploying fetch-shopify-orders Edge Function to Supabase"
echo "============================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo ""
    echo "  macOS:    brew install supabase/tap/supabase"
    echo "  Windows:  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "            scoop install supabase"
    echo "  Linux:    brew install supabase/tap/supabase"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if we're logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please login:"
    supabase login
fi

# Link to project if not already linked
if [ ! -f "supabase/.temp/project-ref" ] || [ "$(cat supabase/.temp/project-ref 2>/dev/null)" != "$PROJECT_REF" ]; then
    echo "🔗 Linking to project ${PROJECT_REF}..."
    supabase link --project-ref $PROJECT_REF
fi

# Deploy the function
echo ""
echo "📦 Deploying Edge Function..."
supabase functions deploy fetch-shopify-orders --no-verify-jwt=false

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "📋 Function Details:"
    echo "  Name: fetch-shopify-orders"
    echo "  URL: https://${PROJECT_REF}.supabase.co/functions/v1/fetch-shopify-orders"
    echo ""
    echo "🧪 Test the function:"
    echo "  1. Go to your app's Settings page"
    echo "  2. Enter your Shopify store URL and Access Token"
    echo "  3. Click 'Testar Conexão e Buscar Encomendas'"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
fi
