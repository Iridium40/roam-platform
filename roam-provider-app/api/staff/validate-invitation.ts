import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InvitationToken {
  businessId: string;
  email: string;
  role: string;
  locationId: string;
  type: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
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

    // Check if the invitation still exists in the database
    const { data: pendingProvider, error: providerError } = await supabase
      .from('providers')
      .select('id, email, provider_role, business_id, location_id, is_active, verification_status')
      .eq('email', decodedToken.email)
      .eq('business_id', decodedToken.businessId)
      .eq('verification_status', 'pending')
      .single();

    if (providerError || !pendingProvider) {
      return res.status(404).json({ 
        error: 'Invitation not found or already used' 
      });
    }

    // Check if user already has an account
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(user => user.email === decodedToken.email);

    if (userExists) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please contact support.' 
      });
    }

    // Get business information
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('business_name')
      .eq('id', decodedToken.businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get location information (if specified)
    let locationName = 'No specific location';
    if (decodedToken.locationId) {
      const { data: location } = await supabase
        .from('business_locations')
        .select('location_name')
        .eq('id', decodedToken.locationId)
        .single();

      if (location) {
        locationName = location.location_name;
      }
    }

    return res.status(200).json({
      success: true,
      invitation: {
        businessId: decodedToken.businessId,
        email: decodedToken.email,
        role: decodedToken.role,
        locationId: decodedToken.locationId,
        businessName: business.business_name,
        locationName: locationName,
      }
    });

  } catch (error) {
    console.error('Error validating invitation:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
