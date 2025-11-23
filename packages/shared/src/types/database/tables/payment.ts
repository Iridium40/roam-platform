import type {
  Json,
  TransactionType,
  Status,
} from '../enums';

// Transactions Table
export interface TransactionsTable {
  Row: {
    id: string;
    booking_id: string;
    amount: number;
    currency: string | null;
    stripe_transaction_id: string | null;
    payment_method: string | null;
    description: string | null;
    metadata: Json | null;
    created_at: string | null;
    processed_at: string | null;
    transaction_type: TransactionType | null;
    status: Status | null;
  };
  Insert: {
    id?: string;
    booking_id: string;
    amount: number;
    currency?: string | null;
    stripe_transaction_id?: string | null;
    payment_method?: string | null;
    description?: string | null;
    metadata?: Json | null;
    created_at?: string | null;
    processed_at?: string | null;
    transaction_type?: TransactionType | null;
    status?: Status | null;
  };
  Update: {
    id?: string;
    booking_id?: string;
    amount?: number;
    currency?: string | null;
    stripe_transaction_id?: string | null;
    payment_method?: string | null;
    description?: string | null;
    metadata?: Json | null;
    created_at?: string | null;
    processed_at?: string | null;
    transaction_type?: TransactionType | null;
    status?: Status | null;
  };
}

// Plaid Bank Connections Table
export interface PlaidBankConnectionsTable {
  Row: {
    id: string;
    user_id: string | null;
    business_id: string | null;
    plaid_access_token: string | null;
    plaid_item_id: string | null;
    plaid_account_id: string | null;
    institution_id: string | null;
    institution_name: string | null;
    account_name: string | null;
    account_mask: string | null;
    account_type: string | null;
    account_subtype: string | null;
    verification_status: string | null;
    routing_numbers: string[] | null;
    account_number_mask: string | null;
    connected_at: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id?: string | null;
    business_id?: string | null;
    plaid_access_token?: string | null;
    plaid_item_id?: string | null;
    plaid_account_id?: string | null;
    institution_id?: string | null;
    institution_name?: string | null;
    account_name?: string | null;
    account_mask?: string | null;
    account_type?: string | null;
    account_subtype?: string | null;
    verification_status?: string | null;
    routing_numbers?: string[] | null;
    account_number_mask?: string | null;
    connected_at?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string | null;
    business_id?: string | null;
    plaid_access_token?: string | null;
    plaid_item_id?: string | null;
    plaid_account_id?: string | null;
    institution_id?: string | null;
    institution_name?: string | null;
    account_name?: string | null;
    account_mask?: string | null;
    account_type?: string | null;
    account_subtype?: string | null;
    verification_status?: string | null;
    routing_numbers?: string[] | null;
    account_number_mask?: string | null;
    connected_at?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
}

// Business Manual Bank Accounts Table
export interface ManualBankAccountsTable {
  Row: {
    id: string;
    user_id: string;
    business_id: string | null;
    account_name: string;
    account_type: string;
    account_number: string;
    routing_number: string;
    bank_name: string;
    is_verified: boolean | null;
    is_default: boolean | null;
    stripe_account_id: string | null;
    verification_status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    business_id?: string | null;
    account_name: string;
    account_type: string;
    account_number: string;
    routing_number: string;
    bank_name: string;
    is_verified?: boolean | null;
    is_default?: boolean | null;
    stripe_account_id?: string | null;
    verification_status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    business_id?: string | null;
    account_name?: string;
    account_type?: string;
    account_number?: string;
    routing_number?: string;
    bank_name?: string;
    is_verified?: boolean | null;
    is_default?: boolean | null;
    stripe_account_id?: string | null;
    verification_status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
}

// Subscription Plans Table
export interface SubscriptionPlansTable {
  Row: {
    id: string;
    plan_name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number | null;
    features: Json;
    max_providers: number | null;
    max_locations: number | null;
    transaction_fee_percentage: number;
    is_active: boolean;
    sort_order: number | null;
    created_at: string;
    updated_at: string;
    stripe_price_id_monthly: string | null;
    stripe_price_id_yearly: string | null;
    stripe_product_id: string | null;
  };
  Insert: {
    id?: string;
    plan_name: string;
    description?: string | null;
    price_monthly: number;
    price_yearly?: number | null;
    features?: Json;
    max_providers?: number | null;
    max_locations?: number | null;
    transaction_fee_percentage?: number;
    is_active?: boolean;
    sort_order?: number | null;
    created_at?: string;
    updated_at?: string;
    stripe_price_id_monthly?: string | null;
    stripe_price_id_yearly?: string | null;
    stripe_product_id?: string | null;
  };
  Update: {
    id?: string;
    plan_name?: string;
    description?: string | null;
    price_monthly?: number;
    price_yearly?: number | null;
    features?: Json;
    max_providers?: number | null;
    max_locations?: number | null;
    transaction_fee_percentage?: number;
    is_active?: boolean;
    sort_order?: number | null;
    created_at?: string;
    updated_at?: string;
    stripe_price_id_monthly?: string | null;
    stripe_price_id_yearly?: string | null;
    stripe_product_id?: string | null;
  };
}

// Device Subscriptions Table
export interface DeviceSubscriptionsTable {
  Row: {
    id: string;
    business_id: string;
    device_type: string;
    transaction_data: string | null;
    start_date: string;
    end_date: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    stripe_price_id: string | null;
    subscription_status: string | null;
  };
  Insert: {
    id?: string;
    business_id: string;
    device_type: string;
    transaction_data?: string | null;
    start_date: string;
    end_date?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
    stripe_price_id?: string | null;
    subscription_status?: string | null;
  };
  Update: {
    id?: string;
    business_id?: string;
    device_type?: string;
    transaction_data?: string | null;
    start_date?: string;
    end_date?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
    stripe_price_id?: string | null;
    subscription_status?: string | null;
  };
}

// Type exports for convenience
export type Transaction = TransactionsTable['Row'];
export type PlaidBankConnection = PlaidBankConnectionsTable['Row'];
export type ManualBankAccount = ManualBankAccountsTable['Row'];
export type SubscriptionPlan = SubscriptionPlansTable['Row'];
export type DeviceSubscription = DeviceSubscriptionsTable['Row'];