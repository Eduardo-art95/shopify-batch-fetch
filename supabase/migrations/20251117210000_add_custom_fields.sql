-- Add JSONB column to orders table for extra fields
ALTER TABLE public.orders
ADD COLUMN extra_fields JSONB DEFAULT '{}'::jsonb;

-- Add field configuration to shopify_config
ALTER TABLE public.shopify_config
ADD COLUMN selected_fields JSONB DEFAULT '{
  "customer_phone": false,
  "billing_address": false,
  "shipping_address": false,
  "line_items": true,
  "fulfillment_status": true,
  "financial_status": true,
  "tags": false,
  "note": false,
  "discount_codes": false,
  "shipping_lines": false,
  "tax_lines": false,
  "subtotal_price": false,
  "total_tax": false,
  "total_discounts": false,
  "tracking_number": false,
  "tracking_company": false
}'::jsonb;

-- Create index on extra_fields for better query performance
CREATE INDEX idx_orders_extra_fields ON public.orders USING gin(extra_fields);

-- Add comment
COMMENT ON COLUMN public.orders.extra_fields IS 'Additional Shopify order fields stored as JSON';
COMMENT ON COLUMN public.shopify_config.selected_fields IS 'User-selected fields to extract from Shopify orders';
