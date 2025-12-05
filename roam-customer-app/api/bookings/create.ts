import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to dynamically import notification function
async function getNotifyProvidersNewBooking() {
  try {
    const importPaths = [
      '../lib/notifications/notify-providers-new-booking.js',
      '../lib/notifications/notify-providers-new-booking',
      './lib/notifications/notify-providers-new-booking.js',
      './lib/notifications/notify-providers-new-booking',
    ];

    for (const importPath of importPaths) {
      try {
        const module = await import(importPath);
        const fn = module.notifyProvidersNewBooking || module.default;
        if (fn && typeof fn === 'function') {
          console.log(`✅ Successfully loaded notify-providers-new-booking from: ${importPath}`);
          return fn;
        }
      } catch (err) {
        continue;
      }
    }

    console.warn('⚠️ Could not load notify-providers-new-booking module');
    return null;
  } catch (err) {
    console.warn('⚠️ Error loading notify-providers-new-booking module:', err);
    return null;
  }
}

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
      serviceId,
      bookingDate,
      startTime,
      guestName,
      guestEmail,
      guestPhone,
      deliveryType,
      specialInstructions,
      customerId
    } = req.body;

    // Validate required fields
    if (!serviceId || !bookingDate || !startTime || !customerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get service details with business type
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          business_name,
          contact_email,
          business_type
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // For independent businesses, automatically assign to owner
    let assignedProviderId = null;
    if (service.business_profiles?.business_type === 'independent' && service.business_id) {
      console.log('Independent business detected, finding owner provider...');
      
      const { data: ownerProvider, error: ownerError } = await supabase
        .from('providers')
        .select('id')
        .eq('business_id', service.business_id)
        .eq('provider_role', 'owner')
        .single();

      if (ownerProvider && !ownerError) {
        assignedProviderId = ownerProvider.id;
        console.log('Auto-assigning booking to owner provider:', assignedProviderId);
      } else {
        console.log('Owner provider not found for independent business');
      }
    }

    // Create booking
    const bookingData: any = {
      service_id: serviceId,
      customer_id: customerId,
      booking_date: bookingDate,
      start_time: startTime,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      delivery_type: deliveryType,
      special_instructions: specialInstructions,
      booking_status: 'pending',
      total_amount: service.price,
      created_at: new Date().toISOString()
    };

    // Add provider_id if auto-assigned
    if (assignedProviderId) {
      bookingData.provider_id = assignedProviderId;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          name,
          email
        )
      `)
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    console.log('Booking created successfully:', booking.id);

    // Send notifications to business users (non-blocking)
    // This will notify the assigned provider OR all owners/dispatchers
    try {
      const notifyFn = await getNotifyProvidersNewBooking();
      
      if (notifyFn) {
        // Get customer details
        const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
        
        // Get business location for address
        const { data: businessLocation } = await supabase
          .from('business_locations')
          .select('address_line1, address_line2, city, state, postal_code')
          .eq('business_id', service.business_profiles.id)
          .eq('is_primary', true)
          .maybeSingle();

        // Format business address
        const businessAddress = businessLocation 
          ? `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim()
          : '';
        
        // Send notification (this is non-blocking and won't fail the booking if it errors)
        await notifyFn({
          booking: {
            id: booking.id,
            business_id: service.business_profiles.id,
            provider_id: assignedProviderId,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            total_amount: booking.total_amount,
            special_instructions: booking.special_instructions,
          },
          service: {
            name: service.name,
          },
          customer: {
            first_name: customer?.first_name || guestName?.split(' ')[0] || 'Guest',
            last_name: customer?.last_name || guestName?.split(' ').slice(1).join(' ') || '',
            email: customer?.email || guestEmail,
            phone: customer?.phone || guestPhone,
          },
          business: {
            name: service.business_profiles.business_name,
            business_address: businessAddress,
          },
        });

        console.log('✅ Notification sent for booking:', booking.id);
      } else {
        console.warn('⚠️ Notification function not available');
      }
    } catch (notificationError) {
      // Notifications are non-critical, log but don't fail the booking
      console.error('⚠️ Failed to send notifications (non-fatal):', notificationError);
    }

    // Send confirmation email to customer (non-blocking)
    try {
      const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
      const customerEmail = customer?.email || guestEmail;
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Guest'
        : guestName || 'Guest';

      if (customerEmail) {
        console.log('📧 Sending booking confirmation to customer:', customerEmail);

        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'https://roamyourbestlife.com';

        // Format dates
        const bookingDate = booking.booking_date 
          ? new Date(booking.booking_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'Date TBD';

        const bookingTime = booking.start_time
          ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : 'Time TBD';

        const businessName = service.business_profiles.business_name;
        const serviceName = service.name;
        const totalAmount = booking.total_amount?.toFixed(2) || '0.00';

        // Get business location for address
        const { data: businessLocation } = await supabase
          .from('business_locations')
          .select('address_line1, address_line2, city, state, postal_code')
          .eq('business_id', service.business_profiles.id)
          .eq('is_primary', true)
          .maybeSingle();

        const businessAddress = businessLocation 
          ? `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim()
          : 'Location TBD';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #2C5F7D; padding: 30px 20px; text-align: center;">
      <img src="${baseUrl}/logo-email.png" alt="ROAM Logo" style="max-width: 200px; height: auto;">
    </div>
    
    <div style="padding: 40px 30px;">
      <div style="color: #4CAF50; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">✓ Booking Request Submitted!</div>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${customerName},</p>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for your booking request! We've notified <strong>${businessName}</strong> and they will review your request shortly.</p>
      
      <div style="background-color: #E3F2FD; border-left: 4px solid #2196F3; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Service:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${serviceName}</div>
        
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Provider:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${businessName}</div>
        
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Date:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${bookingDate}</div>
        
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Time:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${bookingTime}</div>
        
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Location:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${businessAddress}</div>
        
        <div style="color: #1565C0; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Total:</div>
        <div style="color: #333333; font-size: 16px;">$${totalAmount}</div>
      </div>
      
      <div style="background-color: #FFF3CD; border-left: 4px solid #FFC107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⏳ Awaiting Confirmation</strong><br>
          Your booking is pending approval. You'll receive another email once the provider confirms your booking.
        </p>
      </div>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">You can view and manage your bookings anytime from your customer dashboard.</p>
      
      <div style="text-align: center;">
        <a href="https://roamyourbestlife.com/customer/bookings" style="display: inline-block; padding: 15px 30px; background-color: #F4A300; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">View My Bookings</a>
      </div>
      
      <div style="border-top: 1px solid #e0e0e0; margin: 30px 0;"></div>
      
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
        <strong>Booking ID:</strong> ${booking.id}
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        If you have any questions, please contact us at support@roamyourbestlife.com
      </p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 30px; text-align: center; color: #666666; font-size: 14px;">
      <p style="margin: 0 0 10px 0;"><strong>ROAM - Your Best Life. Everywhere.</strong></p>
      <p style="margin: 0 0 10px 0;">
        Need help? Contact us at 
        <a href="mailto:support@roamyourbestlife.com" style="color: #2C5F7D;">support@roamyourbestlife.com</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © 2024 ROAM. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'ROAM Support <support@roamyourbestlife.com>',
          to: [customerEmail],
          subject: `Booking Request Submitted - ${serviceName}`,
          html: emailHtml,
          text: `Booking Request Submitted!

Hi ${customerName},

Thank you for your booking request! We've notified ${businessName} and they will review your request shortly.

BOOKING DETAILS:
Service: ${serviceName}
Provider: ${businessName}
Date: ${bookingDate}
Time: ${bookingTime}
Location: ${businessAddress}
Total: $${totalAmount}

⏳ AWAITING CONFIRMATION
Your booking is pending approval. You'll receive another email once the provider confirms your booking.

You can view and manage your bookings anytime from your customer dashboard:
https://roamyourbestlife.com/customer/bookings

Booking ID: ${booking.id}

If you have any questions, please contact us at support@roamyourbestlife.com

Best regards,
The ROAM Team

© 2024 ROAM. All rights reserved.`,
        });

        if (emailError) {
          console.error('❌ Error sending customer confirmation email:', emailError);
        } else {
          console.log('✅ Customer confirmation email sent:', {
            email: customerEmail,
            resendId: emailData?.id,
          });
        }
      }
    } catch (customerEmailError) {
      console.error('⚠️ Failed to send customer confirmation email (non-fatal):', customerEmailError);
    }

    return res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        status: booking.booking_status,
        totalAmount: booking.total_amount,
        service: {
          id: service.id,
          name: service.name,
          description: service.description
        },
        provider: {
          id: service.providers.id,
          name: `${service.providers.first_name} ${service.providers.last_name}`,
          email: service.providers.email
        },
        business: {
          id: service.business_profiles.id,
          name: service.business_profiles.name
        }
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
