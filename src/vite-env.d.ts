/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SHOPIFY_CLIENT_ID: string;
  readonly VITE_SHOPIFY_REDIRECT_URI: string;
  readonly VITE_SHOPIFY_SCOPES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
