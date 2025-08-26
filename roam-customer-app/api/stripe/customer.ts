import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createStripePaymentService } from '@roam/shared';
import Stripe from 'stripe';

const stripeService = createStripePaymentService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      action,
      email,
      name,
      phone,
      address,
      metadata = {},
      customerId,
      paymentMethodId,
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    switch (action) {
      case 'create_customer': {
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const result = await stripeService.createCustomer({
          email,
          name,
          phone,
          address,
          metadata: {
            ...metadata,
            customerType: 'booking',
          },
        });

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to create customer',
          });
        }

        return res.status(200).json({
          success: true,
          customerId: result.customerId,
          email: result.email,
          name: result.name,
          phone: result.phone,
        });
      }

      case 'update_customer': {
        if (!customerId) {
          return res.status(400).json({ error: 'Customer ID is required' });
        }

        const result = await stripeService.updateCustomer(customerId, {
          name,
          email,
          phone,
          address,
          metadata,
        });

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to update customer',
          });
        }

        return res.status(200).json({
          success: true,
          customerId: result.customerId,
          email: result.email,
          name: result.name,
          phone: result.phone,
        });
      }

      case 'attach_payment_method': {
        if (!customerId || !paymentMethodId) {
          return res.status(400).json({ error: 'Customer ID and Payment Method ID are required' });
        }

        // Attach payment method to customer
        await stripeService.getStripe().paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Set as default payment method
        await stripeService.getStripe().customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Payment method attached successfully',
        });
      }

      case 'get_customer': {
        if (!customerId) {
          return res.status(400).json({ error: 'Customer ID is required' });
        }

        const customerResponse = await stripeService.getStripe().customers.retrieve(customerId);
        
        // Check if customer is deleted
        if (customerResponse.deleted) {
          return res.status(404).json({
            success: false,
            error: 'Customer not found or has been deleted',
          });
        }
        
        // Type guard to ensure it's a Customer, not DeletedCustomer
        const customer = customerResponse as Stripe.Customer;
        
        return res.status(200).json({
          success: true,
          customer: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            metadata: customer.metadata,
            created: customer.created,
          },
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Customer management error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
