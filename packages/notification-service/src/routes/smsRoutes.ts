import { RequestHandler } from "express";
import { smsService } from "../services/smsService";

/**
 * POST /api/sms/test
 * Send a test SMS to verify configuration
 */
export const handleTestSMS: RequestHandler = async (req, res) => {
  try {
    const { userId, providerId, customerId } = req.body;

    if (!userId && !providerId && !customerId) {
      return res.status(400).json({ 
        error: 'ID required',
        message: 'Please provide userId, providerId, or customerId in the request body' 
      });
    }

    console.log('Testing SMS for:', { userId, providerId, customerId });
    const success = await smsService.sendTestSMS({ userId, providerId, customerId });

    if (success) {
      res.status(200).json({ 
        message: 'Test SMS sent successfully',
        userId,
        providerId,
        customerId
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to send SMS',
        message: 'Check that SMS notifications are enabled and a valid phone number is configured'
      });
    }
  } catch (error: any) {
    console.error('Test SMS error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * GET /api/sms/settings/:type/:id
 * Check SMS settings for a user, provider, or customer
 * type: 'user' | 'provider' | 'customer'
 * id: userId, providerId, or customerId
 */
export const handleGetSMSSettings: RequestHandler = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!id || !type) {
      return res.status(400).json({ 
        error: 'Type and ID required' 
      });
    }

    let isEnabled = false;
    let phone: string | null = null;

    if (type === 'provider') {
      isEnabled = await smsService.isSMSEnabledForProvider(id);
      phone = await smsService.getPhoneNumber({ providerId: id });
    } else if (type === 'customer') {
      isEnabled = await smsService.isSMSEnabledForCustomer(id);
      phone = await smsService.getPhoneNumber({ customerId: id });
    } else if (type === 'user') {
      isEnabled = await smsService.isSMSEnabledForUser(id);
      phone = await smsService.getPhoneNumber({ userId: id });
    } else {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be "user", "provider", or "customer"'
      });
    }

    // Format phone number for display
    let formattedPhone = null;
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('1')) {
        const areaCode = digits.slice(1, 4);
        const prefix = digits.slice(4, 7);
        const line = digits.slice(7);
        formattedPhone = `(${areaCode}) ${prefix}-${line}`;
      } else if (digits.length === 10) {
        const areaCode = digits.slice(0, 3);
        const prefix = digits.slice(3, 6);
        const line = digits.slice(6);
        formattedPhone = `(${areaCode}) ${prefix}-${line}`;
      } else {
        formattedPhone = phone;
      }
    }

    res.status(200).json({
      type,
      id,
      enabled: isEnabled,
      phone: formattedPhone,
      rawPhone: phone,
    });
  } catch (error: any) {
    console.error('Get SMS settings error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * POST /api/sms/booking-notification
 * Send a booking notification SMS to provider
 */
export const handleProviderBookingNotification: RequestHandler = async (req, res) => {
  try {
    const { providerId, bookingDetails } = req.body;

    if (!providerId || !bookingDetails) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'providerId and bookingDetails are required'
      });
    }

    const { customerName, serviceName, dateTime, location } = bookingDetails;
    if (!customerName || !serviceName || !dateTime || !location) {
      return res.status(400).json({
        error: 'Incomplete booking details',
        message: 'customerName, serviceName, dateTime, and location are required'
      });
    }

    const success = await smsService.sendProviderBookingNotification(providerId, bookingDetails);

    if (success) {
      res.status(200).json({ 
        message: 'Booking notification sent successfully',
        providerId 
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to send booking notification',
        message: 'Check that SMS notifications are enabled'
      });
    }
  } catch (error: any) {
    console.error('Booking notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * POST /api/sms/booking-confirmation
 * Send a booking confirmation SMS to customer
 */
export const handleCustomerBookingConfirmation: RequestHandler = async (req, res) => {
  try {
    const { customerId, bookingDetails } = req.body;

    if (!customerId || !bookingDetails) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'customerId and bookingDetails are required'
      });
    }

    const { serviceName, dateTime, location } = bookingDetails;
    if (!serviceName || !dateTime || !location) {
      return res.status(400).json({
        error: 'Incomplete booking details',
        message: 'serviceName, dateTime, and location are required'
      });
    }

    const success = await smsService.sendCustomerBookingConfirmation(customerId, {
      ...bookingDetails,
      customerName: '' // Not needed for customer confirmation
    });

    if (success) {
      res.status(200).json({ 
        message: 'Booking confirmation sent successfully',
        customerId 
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to send booking confirmation',
        message: 'Check that SMS notifications are enabled'
      });
    }
  } catch (error: any) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * POST /api/sms/cancellation
 * Send a booking cancellation SMS
 */
export const handleCancellationNotification: RequestHandler = async (req, res) => {
  try {
    const { recipientId, bookingDetails, type } = req.body;

    if (!recipientId || !bookingDetails || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'recipientId, bookingDetails, and type are required'
      });
    }

    if (type !== 'provider' && type !== 'customer') {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be "provider" or "customer"'
      });
    }

    const { customerName, serviceName, dateTime } = bookingDetails;
    if (!customerName || !serviceName || !dateTime) {
      return res.status(400).json({
        error: 'Incomplete booking details',
        message: 'customerName, serviceName, and dateTime are required'
      });
    }

    const success = await smsService.sendCancellationNotification(recipientId, bookingDetails, type);

    if (success) {
      res.status(200).json({ 
        message: 'Cancellation notification sent successfully',
        recipientId,
        type
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to send cancellation notification',
        message: 'Check that SMS notifications are enabled'
      });
    }
  } catch (error: any) {
    console.error('Cancellation notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * POST /api/sms/reminder
 * Send a booking reminder SMS
 */
export const handleBookingReminder: RequestHandler = async (req, res) => {
  try {
    const { recipientId, bookingDetails, type } = req.body;

    if (!recipientId || !bookingDetails || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'recipientId, bookingDetails, and type are required'
      });
    }

    if (type !== 'provider' && type !== 'customer') {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be "provider" or "customer"'
      });
    }

    const { customerName, serviceName, dateTime, location } = bookingDetails;
    if (!customerName || !serviceName || !dateTime || !location) {
      return res.status(400).json({
        error: 'Incomplete booking details',
        message: 'customerName, serviceName, dateTime, and location are required'
      });
    }

    const success = await smsService.sendBookingReminder(recipientId, bookingDetails, type);

    if (success) {
      res.status(200).json({ 
        message: 'Booking reminder sent successfully',
        recipientId,
        type
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to send booking reminder',
        message: 'Check that SMS notifications are enabled'
      });
    }
  } catch (error: any) {
    console.error('Booking reminder error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};
