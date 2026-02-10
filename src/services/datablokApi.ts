// ============================================================================
// API SERVICE
// ============================================================================
// Authentication and CRUD operations.
//
// Setup:
// 1. Define your entity types below (matching your backend schema)
// 2. Add entity names to ENTITIES constant
// 3. Use getApi().list(), getApi().create(), etc. for CRUD operations
// ============================================================================

import { 
  createAuthApi,
  createApiUrl,
  createAuthProvider, 
  useAuth, 
  getStoredUser, 
  getStoredToken, 
  isAuthenticated,
  generateOAuthNonce
} from '@rationalbloks/frontblok-auth';
import { initApi, getApi } from '@rationalbloks/frontblok-crud';
import type { User } from '@rationalbloks/frontblok-auth';

// ============================================================================
// RE-EXPORTS
// ============================================================================
// Centralized imports for convenience

export { getStoredUser, getStoredToken, isAuthenticated };
export { generateOAuthNonce };
export type { User };
export { getApi };

// ============================================================================
// AUTH API SINGLETON
// ============================================================================
// Resolve API URL directly from import.meta.env — this runs in the APP's
// Vite build where VITE_DATABASE_API_URL is correctly injected via Docker
// build-args. Do NOT rely on the library's createApiUrl() because Vite
// statically replaces import.meta.env.* during library builds, baking in
// empty values. The env resolution MUST happen HERE in the consuming app.

const datablokApiUrl = import.meta.env.VITE_DATABASE_API_URL 
  || import.meta.env.VITE_API_URL 
  || (import.meta.env.DEV ? 'http://localhost:8000' : '');

if (!datablokApiUrl && !import.meta.env.DEV) {
  console.error('[RationalBloks] VITE_DATABASE_API_URL is not set. API calls will fail.');
}

export const authApi = createAuthApi(datablokApiUrl);

// Initialize frontblok-crud with authApi for authenticated requests
initApi(authApi);

// ============================================================================
// APP-SPECIFIC TYPES
// ============================================================================

// --- Asset ---
export interface Asset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: 'crypto' | 'stablecoin' | 'cash';
  coingecko_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  symbol: string;
  name: string;
  asset_type: 'crypto' | 'stablecoin' | 'cash';
  coingecko_id?: string;
}

export type UpdateAssetInput = Partial<CreateAssetInput>;

// --- Holding ---
export interface Holding {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_buy_price?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateHoldingInput {
  asset_id: string;
  quantity: number;
  average_buy_price?: number;
}

export type UpdateHoldingInput = Partial<CreateHoldingInput>;

// --- Trade ---
export interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  total_value: number;
  trade_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTradeInput {
  asset_id: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  total_value: number;
  trade_date: string;
  notes?: string;
}

export type UpdateTradeInput = Partial<CreateTradeInput>;

// --- Target Allocation ---
export interface TargetAllocation {
  id: string;
  user_id: string;
  asset_id: string;
  target_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTargetAllocationInput {
  asset_id: string;
  target_percentage: number;
}

export type UpdateTargetAllocationInput = Partial<CreateTargetAllocationInput>;

// ============================================================================
// ENTITY NAMES
// ============================================================================

export const ENTITIES = {
  ASSETS: 'assets',
  HOLDINGS: 'holdings',
  TRADES: 'trades',
  TARGET_ALLOCATIONS: 'target_allocations',
} as const;

// ============================================================================
// AUTH CONTEXT
// ============================================================================
// App-specific auth provider using frontblok-auth's factory.
// Creates React context for authentication state management.

export const ClientAuthProvider = createAuthProvider(authApi);
export const useClientAuth = useAuth;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
// 
// List all tasks:
//   const tasks = await getApi().list<Task>(ENTITIES.TASKS);
//
// Get a single task:
//   const task = await getApi().get<Task>(ENTITIES.TASKS, taskId);
//
// Create a task:
//   const newTask = await getApi().create<Task>(ENTITIES.TASKS, { title: 'New Task' });
//
// Update a task:
//   const updated = await getApi().update<Task>(ENTITIES.TASKS, taskId, { status: 'completed' });
//
// Delete a task:
//   await getApi().delete(ENTITIES.TASKS, taskId);
//
// ============================================================================
