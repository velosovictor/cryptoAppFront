/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_DATABASE_API_URL: string;
  readonly VITE_API_URL: string;
  
  // Stripe Configuration (to be implemented)
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  
  // Application URLs
  readonly VITE_APP_URL: string;
  readonly VITE_SUCCESS_URL: string;
  readonly VITE_CANCEL_URL: string;
  
  // Vite built-in
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
