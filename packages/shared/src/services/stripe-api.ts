import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StripePaymentService } from './stripe-service';
import type {
  CreatePaymentIntentOptions,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateConnectAccountOptions,
  RefundPaymentOptions,
} from './payment';

/**
 * Stripe API actions
 */
export const STRIPE_ACTIONS = {
  // Payment intents
  CREATE_PAYMENT_INTENT: 'create_payment_intent',
  CONFIRM_PAYMENT: 'confirm_payment',
  GET_PAYMENT_STATUS: 'get_payment_status',
  REFUND_PAYMENT: 'refund_payment',
  
  // Customers
  CREATE_CUSTOMER: 'create_customer',
  UPDATE_CUSTOMER: 'update_customer',
  
  // Connect accounts
  CREATE_CONNECT_ACCOUNT: 'create_connect_account',
  GET_CONNECT_ACCOUNT: 'get_connect_account',
  CREATE_ACCOUNT_LINK: 'create_account_link',
  
  // Identity verification
  CREATE_VERIFICATION_SESSION: 'create_verification_session',
  GET_VERIFICATION_STATUS: 'get_verification_status',
  
  // Webhooks
  PROCESS_WEBHOOK: 'process_webhook',
} as const;

export type StripeAction = typeof STRIPE_ACTIONS[keyof typeof STRIPE_ACTIONS];

/**
 * Stripe API interface
 */
export interface StripeAPI {
  handleRequest(req: VercelRequest, res: VercelResponse): Promise<void>;
}

/**
 * Shared Stripe API implementation
 */
export class SharedStripeAPI implements StripeAPI {
  private stripeService: StripePaymentService;

  constructor(stripeService: StripePaymentService) {
    this.stripeService = stripeService;
  }

  async handleRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { action, ...data } = req.body;

      if (!action) {
        res.status(400).json({
          success: false,
          error: 'Missing action parameter',
        });
        return;
      }

      let result;

      switch (action) {
        case STRIPE_ACTIONS.CREATE_PAYMENT_INTENT:
          result = await this.handleCreatePaymentIntent(req, res, data);
          break;

        case STRIPE_ACTIONS.CONFIRM_PAYMENT:
          result = await this.handleConfirmPayment(req, res, data);
          break;

        case STRIPE_ACTIONS.GET_PAYMENT_STATUS:
          result = await this.handleGetPaymentStatus(req, res, data);
          break;

        case STRIPE_ACTIONS.REFUND_PAYMENT:
          result = await this.handleRefundPayment(req, res, data);
          break;

        case STRIPE_ACTIONS.CREATE_CUSTOMER:
          result = await this.handleCreateCustomer(req, res, data);
          break;

        case STRIPE_ACTIONS.UPDATE_CUSTOMER:
          result = await this.handleUpdateCustomer(req, res, data);
          break;

        case STRIPE_ACTIONS.CREATE_CONNECT_ACCOUNT:
          result = await this.handleCreateConnectAccount(req, res, data);
          break;

        case STRIPE_ACTIONS.GET_CONNECT_ACCOUNT:
          result = await this.handleGetConnectAccount(req, res, data);
          break;

        case STRIPE_ACTIONS.CREATE_ACCOUNT_LINK:
          result = await this.handleCreateAccountLink(req, res, data);
          break;

        case STRIPE_ACTIONS.CREATE_VERIFICATION_SESSION:
          result = await this.handleCreateVerificationSession(req, res, data);
          break;

        case STRIPE_ACTIONS.GET_VERIFICATION_STATUS:
          result = await this.handleGetVerificationStatus(req, res, data);
          break;

        case STRIPE_ACTIONS.PROCESS_WEBHOOK:
          result = await this.handleProcessWebhook(req, res, data);
          break;

        default:
          res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
          });
          return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Stripe API error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  private async handleCreatePaymentIntent(_req: VercelRequest, _res: VercelResponse, data: CreatePaymentIntentOptions) {
    return await this.stripeService.createPaymentIntent(data);
  }

  private async handleConfirmPayment(_req: VercelRequest, _res: VercelResponse, data: { paymentIntentId: string; options?: any }) {
    const { paymentIntentId, options } = data;
    if (!paymentIntentId) {
      return {
        success: false,
        error: 'Payment intent ID is required',
      };
    }
    return await this.stripeService.confirmPayment(paymentIntentId, options);
  }

  private async handleGetPaymentStatus(_req: VercelRequest, _res: VercelResponse, data: { paymentId: string }) {
    const { paymentId } = data;
    if (!paymentId) {
      return {
        success: false,
        error: 'Payment ID is required',
      };
    }
    return await this.stripeService.getPaymentStatus(paymentId);
  }

  private async handleRefundPayment(_req: VercelRequest, _res: VercelResponse, data: { paymentId: string; options?: RefundPaymentOptions }) {
    const { paymentId, options } = data;
    if (!paymentId) {
      return {
        success: false,
        error: 'Payment ID is required',
      };
    }
    return await this.stripeService.refundPayment(paymentId, options);
  }

  private async handleCreateCustomer(_req: VercelRequest, _res: VercelResponse, data: CreateCustomerOptions) {
    return await this.stripeService.createCustomer(data);
  }

  private async handleUpdateCustomer(_req: VercelRequest, _res: VercelResponse, data: { customerId: string; options: UpdateCustomerOptions }) {
    const { customerId, options } = data;
    if (!customerId) {
      return {
        success: false,
        error: 'Customer ID is required',
      };
    }
    return await this.stripeService.updateCustomer(customerId, options);
  }

  private async handleCreateConnectAccount(_req: VercelRequest, _res: VercelResponse, data: CreateConnectAccountOptions) {
    return await this.stripeService.createConnectAccount(data);
  }

  private async handleGetConnectAccount(_req: VercelRequest, _res: VercelResponse, data: { accountId: string }) {
    const { accountId } = data;
    if (!accountId) {
      return {
        success: false,
        error: 'Account ID is required',
      };
    }
    return await this.stripeService.getConnectAccount(accountId);
  }

  private async handleCreateAccountLink(_req: VercelRequest, _res: VercelResponse, data: { accountId: string; refreshUrl: string; returnUrl: string }) {
    const { accountId, refreshUrl, returnUrl } = data;
    if (!accountId || !refreshUrl || !returnUrl) {
      return {
        success: false,
        error: 'Account ID, refresh URL, and return URL are required',
      };
    }
    return await this.stripeService.createAccountLink(accountId, refreshUrl, returnUrl);
  }

  private async handleCreateVerificationSession(_req: VercelRequest, _res: VercelResponse, data: { metadata?: Record<string, string>; returnUrl?: string }) {
    return await this.stripeService.createVerificationSession(data);
  }

  private async handleGetVerificationStatus(_req: VercelRequest, _res: VercelResponse, data: { sessionId: string }) {
    const { sessionId } = data;
    if (!sessionId) {
      return {
        success: false,
        error: 'Session ID is required',
      };
    }
    return await this.stripeService.getVerificationSession(sessionId);
  }

  private async handleProcessWebhook(req: VercelRequest, _res: VercelResponse, _data: any) {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return {
        success: false,
        error: 'Missing Stripe signature',
      };
    }

    const rawBody = JSON.stringify(req.body);
    return await this.stripeService.processWebhook(rawBody, signature);
  }
}

/**
 * Factory function to create a Stripe API
 */
export function createStripeAPI(stripeService?: StripePaymentService): StripeAPI {
  const service = stripeService || new StripePaymentService();
  return new SharedStripeAPI(service);
}
