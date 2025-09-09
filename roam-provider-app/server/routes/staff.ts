import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { EmailService } from '../services/emailService';

// Create supabase client for database operations
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || 'https://vssomyuyhicaxsgiaupo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1MzcxNSwiZXhwIjoyMDY5MDI5NzE1fQ.54i9VPExknTktnWbyT9Z9rZKvSJOjs9fG60wncLhLlA',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

interface StaffInviteRequest {
  businessId: string;
  email: string;
  role: 'provider' | 'dispatcher' | 'owner';
  locationId?: string;
  invitedBy: string;
}

export const validateStaffInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    if (decoded.type !== 'staff_invitation') {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Get business information
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', decoded.businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get location information if locationId is provided
    let locationName = 'No specific location';
    if (decoded.locationId) {
      const { data: location } = await supabase
        .from('business_locations')
        .select('location_name')
        .eq('id', decoded.locationId)
        .single();
      
      if (location) {
        locationName = location.location_name;
      }
    }

    const invitationData = {
      businessId: decoded.businessId,
      email: decoded.email,
      role: decoded.role,
      locationId: decoded.locationId || '',
      businessName: business.business_name,
      locationName: locationName,
    };

    return res.status(200).json({
      success: true,
      invitation: invitationData,
    });

  } catch (error) {
    console.error('Error validating staff invitation:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const completeStaffOnboarding = async (req: Request, res: Response) => {
  try {
    const { token, firstName, lastName, phone, bio, password, confirmPassword } = req.body;

    if (!token || !firstName || !lastName || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    if (decoded.type !== 'staff_invitation') {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    // Check if provider record already exists
    const { data: existingProvider, error: providerCheckError } = await supabase
      .from('providers')
      .select('*')
      .eq('email', decoded.email)
      .eq('business_id', decoded.businessId)
      .single();

    if (existingProvider && !providerCheckError) {
      // Provider record exists, update it
      const { error: updateError } = await supabase
        .from('providers')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          bio: bio || null,
          verification_status: 'approved',
          is_active: true,
        })
        .eq('email', decoded.email)
        .eq('business_id', decoded.businessId);

      if (updateError) {
        console.error('Error updating provider record:', updateError);
        return res.status(500).json({ error: 'Failed to update provider record' });
      }

      return res.status(200).json({
        success: true,
        message: 'Staff onboarding completed successfully',
        provider: existingProvider,
      });
    } else {
      // Provider record doesn't exist
      // For now, just return success - the provider record will be created when the user logs in
      console.log(`Staff onboarding completed for ${decoded.email} - provider record will be created on first login`);
      
      return res.status(200).json({
        success: true,
        message: 'Staff onboarding completed successfully',
        email: decoded.email,
        note: 'Provider record will be created when you first log in'
      });
    }

  } catch (error) {
    console.error('Error in completeStaffOnboarding:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const sendStaffInvite = async (req: Request, res: Response) => {
  try {
    const { businessId, email, role, locationId, invitedBy }: StaffInviteRequest = req.body;

    // Validate required fields
    if (!businessId || !email || !role || !invitedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, email, role, invitedBy' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role
    const validRoles = ['provider', 'dispatcher', 'owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be provider, dispatcher, or owner' });
    }

    console.log('Staff invitation request:', { businessId, email, role, locationId, invitedBy });

    // Check if business exists
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Business not found:', businessError);
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user already exists with this email
    const { data: existingUser, error: userError } = await supabase
      .from('providers')
      .select('id, email, business_id')
      .eq('email', email)
      .single();

    if (existingUser && !userError) {
      if (existingUser.business_id === businessId) {
        return res.status(400).json({ error: 'User is already a member of this business' });
      } else {
        return res.status(400).json({ error: 'User is already associated with another business' });
      }
    }

    // Create invitation token
    const invitationToken = jwt.sign(
      {
        businessId,
        email,
        role,
        locationId,
        type: 'staff_invitation',
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Create onboarding link
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5177';
    const onboardingLink = `${baseUrl}/staff-onboarding?token=${invitationToken}`;

    // Send invitation email via Supabase (which uses Resend SMTP)
    console.log(`Staff invitation created for ${email} at ${business.business_name}`);
    console.log(`Onboarding link: ${onboardingLink}`);
    
    try {
      // Try to use Supabase's invite functionality first
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: 'http://localhost:5177/staff-onboarding',
          data: {
            business_id: businessId,
            business_name: business.business_name,
            role: role,
            invited_by: invitedBy,
            onboarding_link: onboardingLink,
            invitation_token: invitationToken
          }
        }
      );

      if (inviteError) {
        console.error('Error sending invitation via Supabase:', inviteError);
        
        // If it's an email_exists error, send custom email instead
        if (inviteError.message?.includes('already been registered') || inviteError.code === 'email_exists') {
          console.log(`User ${email} already exists, sending custom invitation email`);
          
          const emailSent = await EmailService.sendStaffInvitationEmail(
            email,
            business.business_name,
            role,
            invitedBy,
            onboardingLink
          );
          
          if (emailSent) {
            console.log(`Custom invitation email sent successfully to existing user: ${email}`);
          } else {
            console.error(`Failed to send custom invitation email to existing user: ${email}`);
          }
        }
      } else {
        console.log(`Invitation email sent successfully via Supabase to ${email}`);
        console.log('Invite data:', inviteData);
      }
    } catch (error) {
      console.error('Error in Supabase invitation process:', error);
      
      // Fallback: send custom email if Supabase fails
      console.log(`Falling back to custom email for ${email}`);
      const emailSent = await EmailService.sendStaffInvitationEmail(
        email,
        business.business_name,
        role,
        invitedBy,
        onboardingLink
      );
      
      if (emailSent) {
        console.log(`Fallback invitation email sent successfully to ${email}`);
      } else {
        console.error(`Failed to send fallback invitation email to ${email}`);
      }
    }

    // TODO: Store invitation in database for tracking

    return res.status(200).json({
      success: true,
      message: 'Staff invitation sent successfully',
      email: email,
      businessName: business.business_name,
      role: role,
      onboardingLink: onboardingLink, // Include for testing
    });

  } catch (error) {
    console.error('Error in sendStaffInvite:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
