import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { EmailService } from '../../server/services/emailService';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InvitationToken {
  businessId: string;
  email: string;
  role: string;
  locationId?: string;
  type: string;
}

interface OnboardingData {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  bio?: string;
  password: string;
  confirmPassword: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      token,
      firstName,
      lastName,
      phone,
      bio,
      password,
      confirmPassword,
    }: OnboardingData = req.body;

    // Validate required fields
    if (!token || !firstName || !lastName || !phone || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: token, firstName, lastName, phone, password' 
      });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Verify and decode the JWT token
    let decodedToken: InvitationToken;
    try {
      decodedToken = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback-secret'
      ) as InvitationToken;
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Validate token type
    if (decodedToken.type !== 'staff_invitation') {
      return res.status(400).json({ error: 'Invalid invitation type' });
    }

    // Check if the invitation still exists
    const { data: pendingProvider, error: providerError } = await supabase
      .from('providers')
      .select('id')
      .eq('email', decodedToken.email)
      .eq('business_id', decodedToken.businessId)
      .eq('verification_status', 'pending')
      .single();

    if (providerError || !pendingProvider) {
      return res.status(404).json({ 
        error: 'Invitation not found or already used' 
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(user => user.email === decodedToken.email);

    if (userExists) {
      return res.status(400).json({ 
        error: 'An account with this email already exists' 
      });
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: decodedToken.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: 'provider',
        onboarding_type: 'staff_invitation',
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating user account:', authError);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: authError?.message 
      });
    }

    // Update provider record with real information
    const { error: updateError } = await supabase
      .from('providers')
      .update({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        bio: bio || null,
        verification_status: 'verified',
        is_active: true,
        invitation_token: null, // Clear the invitation token
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', pendingProvider.id);

    if (updateError) {
      console.error('Error updating provider record:', updateError);
      
      // Clean up the created user account if provider update fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Error cleaning up user account:', cleanupError);
      }
      
      return res.status(500).json({ 
        error: 'Failed to complete onboarding',
        details: updateError.message 
      });
    }

    // Get business information for welcome email
    const { data: business } = await supabase
      .from('business_profiles')
      .select('business_name')
      .eq('id', decodedToken.businessId)
      .single();

    // Send welcome email (don't fail if email fails)
    try {
      const dashboardUrl = `${req.headers.origin || process.env.FRONTEND_URL}/provider-dashboard`;
      
      const emailSent = await EmailService.sendOnboardingCompleteEmail(
        decodedToken.email,
        firstName,
        dashboardUrl
      );

      if (!emailSent) {
        console.error('Failed to send welcome email to:', decodedToken.email);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue - don't fail the onboarding if email fails
    }

    console.log(`Staff onboarding completed successfully for ${decodedToken.email} at business ${business?.business_name}`);

    return res.status(200).json({
      success: true,
      message: 'Staff onboarding completed successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: firstName,
        lastName: lastName,
        role: decodedToken.role,
        businessName: business?.business_name,
      }
    });

  } catch (error) {
    console.error('Error completing staff onboarding:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
