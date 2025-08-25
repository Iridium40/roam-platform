// Payment status types
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

// Payment service interface
export interface PaymentService {
  createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult>;
  confirmPayment(paymentIntentId: string, options?: ConfirmPaymentOptions): Promise<PaymentResult>;
  refundPayment(paymentId: string, options?: RefundPaymentOptions): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
  createCustomer(options: CreateCustomerOptions): Promise<CustomerResult>;
  updateCustomer(customerId: string, options: UpdateCustomerOptions): Promise<CustomerResult>;
  createConnectAccount(options: CreateConnectAccountOptions): Promise<ConnectAccountResult>;
  getConnectAccount(accountId: string): Promise<ConnectAccountResult>;
}

// Payment options
export interface CreatePaymentIntentOptions {
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number;
  transferData?: {
    destination: string;
    amount?: number;
  };
  receiptEmail?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
}

export interface ConfirmPaymentOptions {
  paymentMethodId?: string;
  returnUrl?: string;
  setupFutureUsage?: 'off_session' | 'on_session';
  offSession?: boolean;
}

export interface RefundPaymentOptions {
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

// Payment results
export interface PaymentIntentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  customerId?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  reason?: string;
  error?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  paymentId?: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  customerId?: string;
  error?: string;
}

// Customer options
export interface CreateCustomerOptions {
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  metadata?: Record<string, string>;
  source?: string;
}

export interface UpdateCustomerOptions {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  success: boolean;
  customerId?: string;
  email?: string;
  name?: string;
  phone?: string;
  error?: string;
}

// Connect account options
export interface CreateConnectAccountOptions {
  type: 'express' | 'standard' | 'custom';
  country: string;
  email: string;
  businessType?: 'individual' | 'company';
  company?: {
    name: string;
    structure?: string;
    taxId?: string;
  };
  businessProfile?: {
    mcc?: string;
    name: string;
    productDescription?: string;
    supportEmail?: string;
    supportPhone?: string;
    supportUrl?: string;
    url?: string;
  };
  capabilities?: {
    cardPayments?: { requested: boolean };
    transfers?: { requested: boolean };
  };
  tosAcceptance?: {
    date: number;
    ip: string;
  };
  metadata?: Record<string, string>;
}

export interface ConnectAccountResult {
  success: boolean;
  accountId?: string;
  accountLink?: string;
  country?: string;
  email?: string;
  businessType?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirements?: {
    currentlyDue?: string[];
    eventuallyDue?: string[];
    pastDue?: string[];
    disabledReason?: string;
  };
  error?: string;
}

// Payment configuration
export interface PaymentConfig {
  provider: 'stripe' | 'paypal' | 'square';
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  apiVersion?: string;
  maxNetworkRetries?: number;
  timeout?: number;
  connect?: {
    enabled: boolean;
    clientId?: string;
    secretKey?: string;
  };
}

// Payment service implementation base class
export abstract class BasePaymentService implements PaymentService {
  protected config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  abstract createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult>;
  abstract confirmPayment(paymentIntentId: string, options?: ConfirmPaymentOptions): Promise<PaymentResult>;
  abstract refundPayment(paymentId: string, options?: RefundPaymentOptions): Promise<RefundResult>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
  abstract createCustomer(options: CreateCustomerOptions): Promise<CustomerResult>;
  abstract updateCustomer(customerId: string, options: UpdateCustomerOptions): Promise<CustomerResult>;
  abstract createConnectAccount(options: CreateConnectAccountOptions): Promise<ConnectAccountResult>;
  abstract getConnectAccount(accountId: string): Promise<ConnectAccountResult>;

  protected validatePaymentIntentOptions(options: CreatePaymentIntentOptions): void {
    if (!options.amount || options.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!options.currency) {
      throw new Error('Currency is required');
    }

    if (options.currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code');
    }
  }

  protected validateCustomerOptions(options: CreateCustomerOptions): void {
    if (!options.email) {
      throw new Error('Customer email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(options.email)) {
      throw new Error('Invalid email address');
    }
  }

  protected validateConnectAccountOptions(options: CreateConnectAccountOptions): void {
    if (!options.type) {
      throw new Error('Account type is required');
    }

    if (!options.country) {
      throw new Error('Country is required');
    }

    if (!options.email) {
      throw new Error('Email is required');
    }

    if (options.type === 'express' && !options.businessProfile?.name) {
      throw new Error('Business name is required for Express accounts');
    }
  }

  protected formatPaymentIntentResult(
    success: boolean,
    paymentIntentId?: string,
    clientSecret?: string,
    amount?: number,
    currency?: string,
    status?: string,
    error?: string
  ): PaymentIntentResult {
    return {
      success,
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status,
      error,
    };
  }

  protected formatPaymentResult(
    success: boolean,
    paymentId?: string,
    amount?: number,
    currency?: string,
    status?: PaymentStatus,
    customerId?: string,
    error?: string
  ): PaymentResult {
    return {
      success,
      paymentId,
      amount,
      currency,
      status,
      customerId,
      error,
    };
  }

  protected formatRefundResult(
    success: boolean,
    refundId?: string,
    amount?: number,
    currency?: string,
    status?: string,
    reason?: string,
    error?: string
  ): RefundResult {
    return {
      success,
      refundId,
      amount,
      currency,
      status,
      reason,
      error,
    };
  }

  protected formatCustomerResult(
    success: boolean,
    customerId?: string,
    email?: string,
    name?: string,
    phone?: string,
    error?: string
  ): CustomerResult {
    return {
      success,
      customerId,
      email,
      name,
      phone,
      error,
    };
  }

  protected formatConnectAccountResult(
    success: boolean,
    accountId?: string,
    accountLink?: string,
    country?: string,
    email?: string,
    businessType?: string,
    chargesEnabled?: boolean,
    payoutsEnabled?: boolean,
    requirements?: any,
    error?: string
  ): ConnectAccountResult {
    return {
      success,
      accountId,
      accountLink,
      country,
      email,
      businessType,
      chargesEnabled,
      payoutsEnabled,
      requirements,
      error,
    };
  }
}
