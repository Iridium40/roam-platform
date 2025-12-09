import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { booking_id, amount, description } = req.body;

    // Validate required fields
    if (!booking_id || !amount || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: booking_id, amount, description' 
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount. Amount must be greater than 0' 
      });
    }

    // Get booking details including customer's user_id for audit trail
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, 
        booking_status, 
        customer_id, 
        remaining_balance, 
        total_amount,
        customer_profiles!inner (
          user_id
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking lookup error:', bookingError);
      return res.status(404).json({ 
        error: 'Booking not found',
        details: bookingError?.message 
      });
    }

    // Verify booking is in a state that allows additional services
    if (booking.booking_status !== 'in_progress' && booking.booking_status !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Additional services can only be added to bookings that are in progress or confirmed',
        current_status: booking.booking_status
      });
    }

    // Calculate new remaining balance
    const currentRemainingBalance = parseFloat(booking.remaining_balance?.toString() || '0');
    const newRemainingBalance = currentRemainingBalance + amountNum;

    console.log('📊 Updating booking:', {
      booking_id,
      currentRemainingBalance,
      amountNum,
      newRemainingBalance
    });

    // Update booking's remaining_balance
    const { error: updateError, data: updatedBooking } = await supabase
      .from('bookings')
      .update({
        remaining_balance: newRemainingBalance,
        remaining_balance_charged: false, // Reset to false since we added more
      })
      .eq('id', booking_id)
      .select('id, remaining_balance, remaining_balance_charged')
      .single();

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      console.error('Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        booking_id,
        newRemainingBalance
      });
      return res.status(500).json({ 
        error: 'Failed to update booking',
        details: updateError.message,
        code: updateError.code,
        hint: updateError.hint
      });
    }

    console.log('✅ Booking updated successfully:', updatedBooking);

    // Create financial_transactions record (no customer_id - derive from booking_id relationship)
    console.log('📝 Creating financial transaction record');
    
    const { data: financialTransaction, error: financialError } = await supabase
      .from('financial_transactions')
      .insert({
        booking_id: booking_id,
        amount: amountNum,
        currency: 'USD',
        transaction_type: 'adjustment',
        status: 'pending',
        description: description.trim(),
        metadata: {
          type: 'additional_service',
          added_at: new Date().toISOString(),
          original_remaining_balance: currentRemainingBalance,
          new_remaining_balance: newRemainingBalance
        }
      })
      .select()
      .single();

    if (financialError) {
      console.error('❌ Error creating financial transaction:', financialError);
      console.error('Financial error details:', {
        code: financialError.code,
        message: financialError.message,
        details: financialError.details,
        hint: financialError.hint
      });
      // Don't fail the request - log and continue
      console.warn('⚠️ Financial transaction creation failed, but booking was updated');
    } else {
      console.log('✅ Financial transaction created successfully:', financialTransaction?.id);
    }

    // Create booking_changes record for audit trail
    // Extract user_id from customer_profiles (changed_by references users table, not customer_profiles)
    const customerProfile = Array.isArray(booking.customer_profiles) 
      ? booking.customer_profiles[0] 
      : booking.customer_profiles;
    
    const userId = customerProfile?.user_id;
    
    // Only create booking change record if we have a valid user_id
    if (userId) {
      const { error: changeError } = await supabase
        .from('booking_changes')
        .insert({
          booking_id: booking_id,
          change_type: 'addon_added', // Using existing type from check constraint
          additional_cost: amountNum,
          refund_amount: 0,
          change_reason: description.trim(),
          old_value: { remaining_balance: currentRemainingBalance },
          new_value: { remaining_balance: newRemainingBalance },
          changed_by: userId, // Use user_id from customer_profiles, not customer_id
        });

      if (changeError) {
        console.error('❌ Error creating booking change record:', changeError);
        console.error('Change error details:', {
          code: changeError.code,
          message: changeError.message,
          details: changeError.details,
          hint: changeError.hint
        });
        // Don't fail the request - log and continue
        console.warn('⚠️ Booking change record creation failed, but booking was updated');
      } else {
        console.log('✅ Booking change record created successfully');
      }
    } else {
      console.warn('⚠️ No user_id found for customer, skipping booking_changes record');
    }

    console.log('✅ Additional service added successfully:', {
      booking_id,
      amount: amountNum,
      description: description.trim(),
      new_remaining_balance: newRemainingBalance,
      financial_transaction_id: financialTransaction?.id
    });

    return res.status(200).json({
      success: true,
      booking_id,
      amount: amountNum,
      description: description.trim(),
      remaining_balance: newRemainingBalance,
      financial_transaction_id: financialTransaction?.id
    });

  } catch (error: any) {
    console.error('❌ Error adding additional service:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Failed to add additional service',
      details: error.message
    });
  }
}

