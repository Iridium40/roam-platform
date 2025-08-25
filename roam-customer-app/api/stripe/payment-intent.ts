import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createStripePaymentService } from '@roam/shared';

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
      amount,
      currency = 'usd',
      customerId,
      customerEmail,
      customerName,
      description,
      metadata = {},
      applicationFeeAmount,
      transferData,
      receiptEmail,
      statementDescriptor,
      statementDescriptorSuffix,
      bookingId,
      serviceId,
      providerId,
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!currency) {
      return res.status(400).json({ error: 'Currency is required' });
    }

    // Add booking-specific metadata
    const enhancedMetadata = {
      ...metadata,
      bookingId: bookingId || '',
      serviceId: serviceId || '',
      providerId: providerId || '',
      paymentType: 'booking',
    };

    // Create payment intent
    const result = await stripeService.createPaymentIntent({
      amount,
      currency,
      customerId,
      customerEmail,
      customerName,
      description: description || `Booking payment - ${bookingId || 'Unknown'}`,
      metadata: enhancedMetadata,
      applicationFeeAmount,
      transferData,
      receiptEmail,
      statementDescriptor,
      statementDescriptorSuffix,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to create payment intent',
      });
    }

    return res.status(200).json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.clientSecret,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
