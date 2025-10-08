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

    // Step 1: Create or get existing Supabase auth user
    let userId: string;
    
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
      
      // Check if user already exists (check for various forms of the message)
      const errorMsg = authError.message.toLowerCase();
      if (errorMsg.includes('already') && (errorMsg.includes('registered') || errorMsg.includes('exists'))) {
        console.log('[Staff Onboarding] User already exists, fetching existing user by email');
        
        // List all users with pagination and find by email (case-insensitive)
        let allUsers: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 20) { // Max 20 pages (20,000 users)
          console.log(`[Staff Onboarding] Fetching users page ${page}...`);
          
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 1000
          });
          
          if (listError) {
            console.error('[Staff Onboarding] Error listing users:', listError);
            return res.status(500).json({ 
              error: 'Failed to fetch existing user',
              details: listError.message 
            });
          }
          
          const batchSize = users?.length || 0;
          console.log(`[Staff Onboarding] Page ${page} returned ${batchSize} users`);
          
          allUsers = allUsers.concat(users || []);
          hasMore = batchSize === 1000;
          page++;
        }
        
        console.log(`[Staff Onboarding] Total users fetched: ${allUsers.length}, searching for: ${decoded.email}`);
        
        const existingUser = allUsers.find(u => u.email?.toLowerCase() === decoded.email.toLowerCase());
        
        if (!existingUser) {
          console.error('[Staff Onboarding] User not found after searching', allUsers.length, 'users');
          console.error('[Staff Onboarding] Email being searched:', decoded.email);
          console.error('[Staff Onboarding] Sample of emails in system:', allUsers.slice(0, 5).map(u => u.email));
          return res.status(400).json({ 
            error: 'User exists but could not be found. Please contact support.',
            details: `Searched ${allUsers.length} users, looking for ${decoded.email}`
          });
        }
        
        userId = existingUser.id;
        console.log(`[Staff Onboarding] Found existing user with ID: ${userId}`);
      } else {
        return res.status(500).json({ 
          error: 'Failed to create user account',
          details: authError.message 
        });
      }
    } else {
      if (!authData.user) {
        console.error('[Staff Onboarding] No user data returned from auth creation');
        return res.status(500).json({ error: 'Failed to create user account' });
      }
      
      userId = authData.user.id;
      console.log(`[Staff Onboarding] Auth user created with ID: ${userId}`);
    }

    // Prepare provider data based on role
    const providerData: any = {
      user_id: userId,  // This links to auth.users.id
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
      business_managed: true, // Default value for business_managed
    };

    // Add optional fields that exist in the providers table
    if (avatarUrl) providerData.image_url = avatarUrl;
    if (coverImageUrl) providerData.cover_image_url = coverImageUrl;
    // Note: professional_title, years_experience, and availability_schedule columns don't exist in providers table

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
      
      const serviceAssignments = selectedServices.map(serviceId => ({
        provider_id: providerId,
        service_id: serviceId,
        is_active: true,
      }));

      const { error: assignmentError } = await supabase
        .from('provider_services')
        .insert(serviceAssignments);

      if (assignmentError) {
        console.error('[Staff Onboarding] Error assigning services:', assignmentError);
        // Don't fail the whole onboarding if service assignment fails
      } else {
        console.log(`[Staff Onboarding] Services assigned successfully`);
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

// Generate a random temporary password
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Manual staff creation endpoint
export const createStaffManually = async (req: Request, res: Response) => {
  try {
    const { businessId, firstName, lastName, email, phone, role, locationId } = req.body;

    // Validate required fields
    if (!businessId || !firstName || !lastName || !email || !phone || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, firstName, lastName, email, phone, role' 
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

    console.log('Manual staff creation request:', { businessId, firstName, lastName, email, role });

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

    // Check if user already exists with this email in auth.users
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const authUserExists = existingAuthUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (authUserExists) {
      // Check if they're already a provider in the system
      const { data: existingProvider } = await supabase
        .from('providers')
        .select('id, business_id')
        .eq('email', email)
        .single();

      if (existingProvider) {
        if (existingProvider.business_id === businessId) {
          return res.status(400).json({ error: 'User is already a member of this business' });
        } else {
          return res.status(400).json({ error: 'User is already associated with another business' });
        }
      }
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    console.log('Generated temporary password for', email);

    // Create user account in Supabase Auth
    let userId: string;
    
    if (authUserExists) {
      // User exists in auth, use their ID
      userId = authUserExists.id;
      console.log('Using existing auth user:', userId);
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email since owner is creating
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          must_change_password: true, // Flag to force password change on first login
        },
      });

      if (createError || !newUser.user) {
        console.error('Error creating auth user:', createError);
        return res.status(500).json({ 
          error: 'Failed to create user account',
          details: createError?.message 
        });
      }

      userId = newUser.user.id;
      console.log('Created new auth user:', userId);
    }

    // Create provider record
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        provider_role: role,
        location_id: locationId || null,
        business_id: businessId,
        verification_status: 'pending', // Pending until owner manually approves
        is_active: false, // Inactive until owner activates
        business_managed: true,
      })
      .select()
      .single();

    if (providerError) {
      console.error('Error creating provider record:', providerError);
      // If provider creation fails, try to delete the auth user we just created
      if (!authUserExists) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return res.status(500).json({ 
        error: 'Failed to create provider record',
        details: providerError.message 
      });
    }

    console.log(`Staff member ${firstName} ${lastName} created successfully`);

    return res.status(200).json({
      success: true,
      message: 'Staff member created successfully',
      temporaryPassword: temporaryPassword, // Return temp password so owner can share it
      provider: {
        id: provider.id,
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: role,
      },
    });

  } catch (error) {
    console.error('Error in createStaffManually:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
