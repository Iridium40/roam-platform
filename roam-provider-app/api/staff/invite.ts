import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../../server/services/emailService';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StaffInviteRequest {
  businessId: string;
  email: string;
  role: 'provider' | 'dispatcher' | 'owner';
  locationId?: string; // Optional - can be empty for no specific location
  invitedBy: string; // Name of the person sending the invite
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      businessId,
      email,
      role,
      locationId,
      invitedBy,
    }: StaffInviteRequest = req.body;

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
    if (!['provider', 'dispatcher', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get business information
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(user => user.email === email);

    if (userExists) {
      // Check if they're already part of this business
      const { data: existingProvider } = await supabase
        .from('providers')
        .select('id')
        .eq('email', email)
        .eq('business_id', businessId)
        .single();

      if (existingProvider) {
        return res.status(400).json({ 
          error: 'This email is already associated with your business' 
        });
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

    // Create pending provider record
    const { error: providerError } = await supabase
      .from('providers')
      .insert({
        first_name: 'Pending',
        last_name: 'Invitation',
        email: email,
        phone: '',
        provider_role: role,
        location_id: locationId || null,
        business_id: businessId,
        verification_status: 'pending',
        is_active: false,
        business_managed: true,
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString(),
      });

    if (providerError) {
      console.error('Error creating pending provider record:', providerError);
      return res.status(500).json({ error: 'Failed to create invitation record' });
    }

    // Create onboarding link
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'https://roam-provider-app.vercel.app';
    const onboardingLink = `${baseUrl}/staff-onboarding?token=${invitationToken}`;

    // Send invitation email
    const emailSent = await EmailService.sendStaffInvitationEmail(
      email,
      business.business_name,
      role,
      invitedBy,
      onboardingLink
    );

    if (!emailSent) {
      console.error('Failed to send invitation email to:', email);
      // Still return success as the invitation record was created
    }

    console.log(`Staff invitation sent successfully to ${email} for business ${business.business_name}`);

    return res.status(200).json({
      success: true,
      message: 'Staff invitation sent successfully',
      email: email,
      businessName: business.business_name,
      role: role,
    });

  } catch (error) {
    console.error('Error sending staff invitation:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
