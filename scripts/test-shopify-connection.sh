#!/bin/bash

# Test Shopify Connection Script
# Run this to verify your Shopify credentials work

# Configuration - Replace with your actual values
SHOP_URL="${SHOPIFY_SHOP_URL:-your-store.myshopify.com}"
ACCESS_TOKEN="${SHOPIFY_ACCESS_TOKEN:-your-access-token}"

echo "🔍 Testing Shopify API Connection"
echo "=================================="
echo ""

# Check if credentials are set
if [ "$SHOP_URL" = "your-store.myshopify.com" ] || [ "$ACCESS_TOKEN" = "your-access-token" ]; then
    echo "⚠️  Please set your Shopify credentials first!"
    echo ""
    echo "Option 1: Set environment variables:"
    echo "  export SHOPIFY_SHOP_URL='your-store.myshopify.com'"
    echo "  export SHOPIFY_ACCESS_TOKEN='shpss_your_token'"
    echo "  ./scripts/test-shopify-connection.sh"
    echo ""
    echo "Option 2: Edit this script and replace the placeholders"
    exit 1
fi

echo "Store: $SHOP_URL"
echo ""

# Test 1: Get Shop Info
echo "📦 Test 1: Getting Shop Information..."
SHOP_INFO=$(curl -s -X GET \
  "https://${SHOP_URL}/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$SHOP_INFO" | grep -q '"shop"'; then
    SHOP_NAME=$(echo "$SHOP_INFO" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Connection successful!"
    echo "   Shop Name: $SHOP_NAME"
else
    echo "❌ Connection failed!"
    echo "   Response: $SHOP_INFO"
    exit 1
fi

echo ""

# Test 2: Get Orders
echo "📋 Test 2: Fetching Orders..."
ORDERS=$(curl -s -X GET \
  "https://${SHOP_URL}/admin/api/2024-01/orders.json?status=any&limit=5" \
  -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$ORDERS" | grep -q '"orders"'; then
    ORDER_COUNT=$(echo "$ORDERS" | grep -o '"id":' | wc -l)
    echo "✅ Orders fetched successfully!"
    echo "   Found: $ORDER_COUNT orders"

    # Show first order if exists
    if [ "$ORDER_COUNT" -gt 0 ]; then
        echo ""
        echo "   Sample Order:"
        FIRST_ORDER_NUMBER=$(echo "$ORDERS" | grep -o '"order_number":[0-9]*' | head -1 | cut -d':' -f2)
        FIRST_ORDER_TOTAL=$(echo "$ORDERS" | grep -o '"total_price":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "     - Order #$FIRST_ORDER_NUMBER"
        echo "     - Total: $FIRST_ORDER_TOTAL"
    fi
else
    echo "❌ Failed to fetch orders!"
    echo "   Response: $ORDERS"
fi

echo ""
echo "=================================="
echo "✅ All tests passed! Your Shopify credentials are valid."
echo ""
echo "📋 Next Steps:"
echo "1. Deploy the Edge Function (run: ./scripts/deploy-edge-function.sh)"
echo "2. Login to your app"
echo "3. Go to Settings page"
echo "4. Enter these credentials:"
echo "   - URL: $SHOP_URL"
echo "   - Token: $ACCESS_TOKEN"
echo "5. Click 'Testar Conexão e Buscar Encomendas'"
