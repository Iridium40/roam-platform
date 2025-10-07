import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { EmailService } from '../services/emailService';

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Validate environment on startup
validateEnvironment();

// Create supabase client for database operations
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const { 
      token, 
      firstName, 
      lastName, 
      phone, 
      bio, 
      password,
      professionalTitle,
      yearsExperience,
      avatarUrl,
      coverImageUrl,
      availability,
      selectedServices,
    } = req.body;

    console.log('[Staff Onboarding] Starting onboarding process');

    if (!token || !firstName || !lastName || !phone || !password) {
      console.log('[Staff Onboarding] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    if (decoded.type !== 'staff_invitation') {
      console.log('[Staff Onboarding] Invalid invitation token type');
      return res.status(400).json({ error: 'Invalid invitation token' });
    }

    console.log(`[Staff Onboarding] Creating auth user for email: ${decoded.email}`);

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: decoded.email,
      password: password,
      email_confirm: true, // Auto-confirm email since they were invited
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      }
    });

    if (authError) {
      console.error('[Staff Onboarding] Error creating auth user:', authError);
      
      // Check if user already exists
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return res.status(400).json({ 
          error: 'An account with this email already exists. Please use the login page.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: authError.message 
      });
    }

    if (!authData.user) {
      console.error('[Staff Onboarding] No user data returned from auth creation');
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    console.log(`[Staff Onboarding] Auth user created with ID: ${authData.user.id}`);

    // Prepare provider data based on role
    const providerData: any = {
      id: authData.user.id,
      business_id: decoded.businessId,
      email: decoded.email,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      bio: bio || null,
      provider_role: decoded.role, // Use provider_role instead of role
      location_id: decoded.locationId || null,
      verification_status: 'approved',
      is_active: true,
    };

    // Add optional fields
    if (avatarUrl) providerData.image_url = avatarUrl;
    if (coverImageUrl) providerData.cover_image_url = coverImageUrl;
    if (professionalTitle) providerData.professional_title = professionalTitle;
    if (yearsExperience !== undefined) providerData.years_experience = yearsExperience;
    if (availability) providerData.availability_schedule = availability;

    // Step 2: Check if provider record already exists
    const { data: existingProvider, error: providerCheckError } = await supabase
      .from('providers')
      .select('*')
      .eq('email', decoded.email)
      .eq('business_id', decoded.businessId)
      .single();

    let providerId: string;

    if (existingProvider && !providerCheckError) {
      // Provider record exists, update it with the auth user ID
      console.log(`[Staff Onboarding] Updating existing provider record`);
      
      const { data: updatedProvider, error: updateError } = await supabase
        .from('providers')
        .update(providerData)
        .eq('email', decoded.email)
        .eq('business_id', decoded.businessId)
        .select()
        .single();

      if (updateError) {
        console.error('[Staff Onboarding] Error updating provider record:', updateError);
        return res.status(500).json({ error: 'Failed to update provider record' });
      }

      providerId = updatedProvider.id;
      console.log(`[Staff Onboarding] Provider record updated successfully`);
    } else {
      // Provider record doesn't exist, create it
      console.log(`[Staff Onboarding] Creating new provider record`);
      
      const { data: newProvider, error: insertError } = await supabase
        .from('providers')
        .insert(providerData)
        .select()
        .single();

      if (insertError) {
        console.error('[Staff Onboarding] Error creating provider record:', insertError);
        return res.status(500).json({ 
          error: 'Failed to create provider record',
          details: insertError.message 
        });
      }

      providerId = newProvider.id;
      console.log(`[Staff Onboarding] Provider record created successfully`);
    }

    // Step 3: Handle service assignments for providers
    if (decoded.role === 'provider' && selectedServices && selectedServices.length > 0) {
      console.log(`[Staff Onboarding] Assigning ${selectedServices.length} services to provider`);
      
      // Get business services to map service_id to business_service_id
      const { data: businessServices, error: servicesError } = await supabase
        .from('business_services')
        .select('id, service_id')
        .eq('business_id', decoded.businessId)
        .in('service_id', selectedServices);

      if (!servicesError && businessServices) {
        const serviceAssignments = businessServices.map(bs => ({
          provider_id: providerId,
          business_service_id: bs.id,
          is_available: true,
        }));

        const { error: assignmentError } = await supabase
          .from('provider_service_assignments')
          .insert(serviceAssignments);

        if (assignmentError) {
          console.error('[Staff Onboarding] Error assigning services:', assignmentError);
          // Don't fail the whole onboarding if service assignment fails
        } else {
          console.log(`[Staff Onboarding] Services assigned successfully`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Staff onboarding completed successfully',
      providerId: providerId,
    });

  } catch (error) {
    console.error('[Staff Onboarding] Error in completeStaffOnboarding:', error);
    
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
