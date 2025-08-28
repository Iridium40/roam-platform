import Stripe from 'stripe';
import { env } from '../config/environment';
import {
  BasePaymentService,
  PaymentConfig,
  CreatePaymentIntentOptions,
  PaymentIntentResult,
  ConfirmPaymentOptions,
  PaymentResult,
  RefundPaymentOptions,
  RefundResult,
  PaymentStatusResult,
  CreateCustomerOptions,
  CustomerResult,
  UpdateCustomerOptions,
  CreateConnectAccountOptions,
  ConnectAccountResult,
} from './payment';

/**
 * Stripe-specific payment service implementation
 */
export class StripePaymentService extends BasePaymentService {
  private stripe: Stripe;

  constructor(config?: Partial<PaymentConfig>) {
    const stripeConfig: PaymentConfig = {
      provider: 'stripe',
      secretKey: config?.secretKey || env.stripe.secretKey,
      publishableKey: config?.publishableKey || env.stripe.publishableKey,
      webhookSecret: config?.webhookSecret || env.stripe.webhookSecret,
      apiVersion: '2024-06-20',
      maxNetworkRetries: 3,
      timeout: 10000,
      connect: {
        enabled: true,
        secretKey: config?.connect?.secretKey || env.stripe.secretKey,
      },
    };

    super(stripeConfig);
    
    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: this.config.apiVersion as any,
      maxNetworkRetries: this.config.maxNetworkRetries,
      timeout: this.config.timeout,
    });
  }

  // Public getter for stripe instance
  getStripe(): Stripe {
    return this.stripe;
  }

  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult> {
    try {
      this.validatePaymentIntentOptions(options);

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(options.amount * 100), // Convert to cents
        currency: options.currency.toLowerCase(),
        description: options.description,
        metadata: options.metadata || {},
        receipt_email: options.receiptEmail,
        statement_descriptor: options.statementDescriptor,
        statement_descriptor_suffix: options.statementDescriptorSuffix,
      };

      // Add customer information
      if (options.customerId) {
        paymentIntentParams.customer = options.customerId;
      }

      // Add application fee for marketplace
      if (options.applicationFeeAmount) {
        paymentIntentParams.application_fee_amount = Math.round(options.applicationFeeAmount * 100);
      }

      // Add transfer data for Stripe Connect
      if (options.transferData) {
        paymentIntentParams.transfer_data = {
          destination: options.transferData.destination,
          amount: options.transferData.amount ? Math.round(options.transferData.amount * 100) : undefined,
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      return this.formatPaymentIntentResult(
        true,
        paymentIntent.id,
        paymentIntent.client_secret || undefined,
        paymentIntent.amount / 100,
        paymentIntent.currency,
        paymentIntent.status
      );
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return this.formatPaymentIntentResult(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to create payment intent'
      );
    }
  }

  async confirmPayment(paymentIntentId: string, options?: ConfirmPaymentOptions): Promise<PaymentResult> {
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};

      if (options?.paymentMethodId) {
        confirmParams.payment_method = options.paymentMethodId;
      }

      if (options?.returnUrl) {
        confirmParams.return_url = options.returnUrl;
      }

      if (options?.setupFutureUsage) {
        confirmParams.setup_future_usage = options.setupFutureUsage;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, confirmParams);

      return this.formatPaymentResult(
        paymentIntent.status === 'succeeded',
        paymentIntent.id,
        paymentIntent.amount / 100,
        paymentIntent.currency,
        this.mapStripeStatusToPaymentStatus(paymentIntent.status),
        paymentIntent.customer as string
      );
    } catch (error) {
      console.error('Error confirming payment:', error);
      return this.formatPaymentResult(
        false,
        paymentIntentId,
        undefined,
        undefined,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Failed to confirm payment'
      );
    }
  }

  async refundPayment(paymentId: string, options?: RefundPaymentOptions): Promise<RefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentId,
      };

      if (options?.amount) {
        refundParams.amount = Math.round(options.amount * 100);
      }

      if (options?.reason) {
        refundParams.reason = options.reason;
      }

      if (options?.metadata) {
        refundParams.metadata = options.metadata;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return this.formatRefundResult(
        refund.status === 'succeeded',
        refund.id,
        refund.amount / 100,
        refund.currency,
        refund.status || undefined,
        refund.reason || undefined
      );
    } catch (error) {
      console.error('Error refunding payment:', error);
      return this.formatRefundResult(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to refund payment'
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string,
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        success: false,
        paymentId,
        error: error instanceof Error ? error.message : 'Failed to get payment status',
      };
    }
  }

  async createCustomer(options: CreateCustomerOptions): Promise<CustomerResult> {
    try {
      this.validateCustomerOptions(options);

      const customerParams: Stripe.CustomerCreateParams = {
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: options.metadata || {},
      };

      if (options.address) {
        customerParams.address = {
          line1: options.address.line1,
          line2: options.address.line2,
          city: options.address.city,
          state: options.address.state,
          postal_code: options.address.postalCode,
          country: options.address.country,
        };
      }

      if (options.source) {
        customerParams.source = options.source;
      }

      const customer = await this.stripe.customers.create(customerParams);

      return this.formatCustomerResult(
        true,
        customer.id,
        customer.email || undefined,
        customer.name || undefined,
        customer.phone || undefined
      );
    } catch (error) {
      console.error('Error creating customer:', error);
      return this.formatCustomerResult(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to create customer'
      );
    }
  }

  async updateCustomer(customerId: string, options: UpdateCustomerOptions): Promise<CustomerResult> {
    try {
      const updateParams: Stripe.CustomerUpdateParams = {};

      if (options.name !== undefined) updateParams.name = options.name;
      if (options.email !== undefined) updateParams.email = options.email;
      if (options.phone !== undefined) updateParams.phone = options.phone;
      if (options.metadata !== undefined) updateParams.metadata = options.metadata;

      if (options.address) {
        updateParams.address = {
          line1: options.address.line1,
          line2: options.address.line2,
          city: options.address.city,
          state: options.address.state,
          postal_code: options.address.postalCode,
          country: options.address.country,
        };
      }

      const customer = await this.stripe.customers.update(customerId, updateParams);

      return this.formatCustomerResult(
        true,
        customer.id,
        customer.email || undefined,
        customer.name || undefined,
        customer.phone || undefined
      );
    } catch (error) {
      console.error('Error updating customer:', error);
      return this.formatCustomerResult(
        false,
        customerId,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to update customer'
      );
    }
  }

  async createConnectAccount(options: CreateConnectAccountOptions): Promise<ConnectAccountResult> {
    try {
      this.validateConnectAccountOptions(options);

      const accountParams: Stripe.AccountCreateParams = {
        type: options.type,
        country: options.country,
        email: options.email,
        metadata: options.metadata || {},
      };

      if (options.businessType) {
        accountParams.business_type = options.businessType;
      }

      if (options.company) {
        accountParams.company = {
          name: options.company.name,
          structure: options.company.structure as any,
          tax_id: options.company.taxId,
        };
      }

      if (options.businessProfile) {
        accountParams.business_profile = {
          mcc: options.businessProfile.mcc,
          name: options.businessProfile.name,
          product_description: options.businessProfile.productDescription,
          support_email: options.businessProfile.supportEmail,
          support_phone: options.businessProfile.supportPhone,
          support_url: options.businessProfile.supportUrl,
          url: options.businessProfile.url,
        };
      }

      if (options.capabilities) {
        accountParams.capabilities = {};
        if (options.capabilities.cardPayments) {
          accountParams.capabilities.card_payments = options.capabilities.cardPayments;
        }
        if (options.capabilities.transfers) {
          accountParams.capabilities.transfers = options.capabilities.transfers;
        }
      }

      if (options.tosAcceptance) {
        accountParams.tos_acceptance = {
          date: options.tosAcceptance.date,
          ip: options.tosAcceptance.ip,
        };
      }

      const account = await this.stripe.accounts.create(accountParams);

      return this.formatConnectAccountResult(
        true,
        account.id,
        undefined, // Account link will be created separately
        account.country,
        account.email || undefined,
        account.business_type || undefined,
        account.charges_enabled,
        account.payouts_enabled,
        account.requirements
      );
    } catch (error) {
      console.error('Error creating Connect account:', error);
      return this.formatConnectAccountResult(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to create Connect account'
      );
    }
  }

  async getConnectAccount(accountId: string): Promise<ConnectAccountResult> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return this.formatConnectAccountResult(
        true,
        account.id,
        undefined,
        account.country,
        account.email || undefined,
        account.business_type || undefined,
        account.charges_enabled,
        account.payouts_enabled,
        account.requirements
      );
    } catch (error) {
      console.error('Error retrieving Connect account:', error);
      return this.formatConnectAccountResult(
        false,
        accountId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Failed to retrieve Connect account'
      );
    }
  }

  /**
   * Create an account link for Stripe Connect onboarding
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return {
        success: true,
        url: accountLink.url,
      };
    } catch (error) {
      console.error('Error creating account link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create account link',
      };
    }
  }

  /**
   * Create a verification session for Stripe Identity
   */
  async createVerificationSession(options: { metadata?: Record<string, string>; returnUrl?: string }): Promise<{ success: boolean; sessionId?: string; clientSecret?: string; error?: string }> {
    try {
      const session = await this.stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: options.metadata || {},
        return_url: options.returnUrl,
      });

      return {
        success: true,
        sessionId: session.id,
        clientSecret: session.client_secret || undefined,
      };
    } catch (error) {
      console.error('Error creating verification session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create verification session',
      };
    }
  }

  /**
   * Get verification session status
   */
  async getVerificationSession(sessionId: string): Promise<{ success: boolean; status?: string; verified?: boolean; error?: string }> {
    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(sessionId);

      return {
        success: true,
        status: session.status,
        verified: session.status === 'verified',
      };
    } catch (error) {
      console.error('Error retrieving verification session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve verification session',
      };
    }
  }

  /**
   * Process webhook events
   */
  async processWebhook(rawBody: string, signature: string): Promise<{ success: boolean; event?: Stripe.Event; error?: string }> {
    try {
      if (!this.config.webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);

      return {
        success: true,
        event,
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook',
      };
    }
  }

  private mapStripeStatusToPaymentStatus(stripeStatus: string): 'pending' | 'succeeded' | 'failed' | 'canceled' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
        return 'canceled';
      case 'processing':
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      default:
        return 'failed';
    }
  }
}

/**
 * Factory function to create a Stripe payment service
 */
export function createStripePaymentService(config?: Partial<PaymentConfig>): StripePaymentService {
  return new StripePaymentService(config);
}

/**
 * Default Stripe payment service instance
 * Only create in server environments where secret key is available
 */
export const stripePaymentService = (() => {
  try {
    // Only create the service if we're in a server environment with proper configuration
    const isBrowser = typeof window !== 'undefined';
    const hasSecretKey = env.stripe.secretKey;
    
    if (isBrowser || !hasSecretKey) {
      // Return a mock service for browser environments
      return {
        getStripe: () => {
          throw new Error('Stripe service not available in browser environment');
        },
        createPaymentIntent: async () => {
          throw new Error('Stripe service not available in browser environment');
        },
        confirmPayment: async () => {
          throw new Error('Stripe service not available in browser environment');
        },
        // Add other methods as needed with similar error messages
      } as any;
    }
    
    return createStripePaymentService();
  } catch (error) {
    console.warn('Failed to initialize Stripe service:', error);
    return {
      getStripe: () => {
        throw new Error('Stripe service not available');
      },
      createPaymentIntent: async () => {
        throw new Error('Stripe service not available');
      },
      confirmPayment: async () => {
        throw new Error('Stripe service not available');
      },
      // Add other methods as needed with similar error messages
    } as any;
  }
})();
