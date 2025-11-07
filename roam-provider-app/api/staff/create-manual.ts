import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ManualStaffCreateRequest {
  businessId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'provider' | 'dispatcher' | 'owner';
  locationId?: string | null;
}

// Generate a secure temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      businessId,
      firstName,
      lastName,
      email,
      phone,
      role,
      locationId,
    }: ManualStaffCreateRequest = req.body;

    console.log('📝 Creating manual staff member:', { businessId, email, role });

    // Validate required fields
    if (!businessId || !firstName || !lastName || !email || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'businessId, firstName, lastName, email, and role are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role
    if (!['provider', 'dispatcher', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: provider, dispatcher, or owner' });
    }

    // Get business information
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('❌ Business not found:', businessError);
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user already exists with this email
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to check existing users' });
    }

    const userExists = existingUsers?.users?.find(user => user.email?.toLowerCase() === email.toLowerCase());

    if (userExists) {
      // Check if they're already part of this business
      const { data: existingProvider } = await supabase
        .from('providers')
        .select('id, first_name, last_name')
        .eq('user_id', userExists.id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (existingProvider) {
        return res.status(400).json({ 
          error: 'Staff member already exists',
          details: `${existingProvider.first_name} ${existingProvider.last_name} is already associated with your business`
        });
      }

      // User exists but not in this business - add them as provider
      console.log('ℹ️ User exists, adding to business as provider');
      
      const { data: newProvider, error: providerError } = await supabase
        .from('providers')
        .insert({
          user_id: userExists.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || '',
          provider_role: role,
          location_id: locationId || null,
          business_id: businessId,
          verification_status: 'approved',
          is_active: true,
          business_managed: true,
        })
        .select()
        .single();

      if (providerError) {
        console.error('❌ Error creating provider record:', providerError);
        return res.status(500).json({ 
          error: 'Failed to create provider record',
          details: providerError.message
        });
      }

      console.log('✅ Staff member added to business (existing user)');
      
      return res.status(200).json({
        success: true,
        message: 'Staff member added successfully (used existing account)',
        provider: newProvider,
        temporaryPassword: null, // No password needed - user already has account
        existingUser: true
      });
    }

    // Create new user with temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    console.log('🔐 Creating new auth user...');
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: 'provider',
      }
    });

    if (authError || !newUser.user) {
      console.error('❌ Error creating auth user:', authError);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: authError?.message || 'Unknown error'
      });
    }

    console.log('✅ Auth user created:', newUser.user.id);

    // Create provider record
    console.log('📝 Creating provider record...');
    const { data: newProvider, error: providerError } = await supabase
      .from('providers')
      .insert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || '',
        provider_role: role,
        location_id: locationId || null,
        business_id: businessId,
        verification_status: 'approved',
        is_active: true,
        business_managed: true,
      })
      .select()
      .single();

    if (providerError) {
      console.error('❌ Error creating provider record:', providerError);
      
      // Cleanup: delete the auth user we just created
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id);
        console.log('🗑️ Cleaned up auth user after provider creation failure');
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup auth user:', cleanupError);
      }
      
      return res.status(500).json({ 
        error: 'Failed to create provider record',
        details: providerError.message
      });
    }

    console.log('✅ Provider record created:', newProvider.id);
    console.log(`🎉 Staff member created successfully: ${firstName} ${lastName}`);

    return res.status(200).json({
      success: true,
      message: 'Staff member created successfully',
      provider: newProvider,
      temporaryPassword: temporaryPassword,
      existingUser: false
    });

  } catch (error) {
    console.error('❌ Error creating manual staff member:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

