import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract userId - try multiple methods
  let userId: string | undefined;
  
  // Method 1: Direct from req.query (standard Vercel file-based routing)
  if (req.query.userId && typeof req.query.userId === 'string') {
    userId = req.query.userId;
  }
  
  // Method 2: Extract from URL path if not found
  if (!userId && req.url) {
    const urlMatch = req.url.match(/\/api\/provider\/profile\/([a-f0-9-]{36}|[^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      userId = urlMatch[1];
    }
  }
  
  // Method 3: Check all query keys for UUID-like values
  if (!userId) {
    for (const [key, value] of Object.entries(req.query)) {
      const strValue = Array.isArray(value) ? value[0] : String(value);
      if (strValue && /^[a-f0-9-]{36}$/i.test(strValue)) {
        userId = strValue;
        break;
      }
    }
  }

  if (!userId || typeof userId !== 'string') {
    console.error('✗ Failed to extract userId');
    return res.status(400).json({ 
      error: 'Invalid user ID',
      debug: {
        url: req.url,
        query: req.query,
        extracted: userId
      }
    });
  }

  if (req.method === 'GET') {
    try {
      // Handle test user IDs specially
      if (userId.startsWith('test-')) {
        return res.status(200).json({
          professionalTitle: 'Test Provider',
          professionalBio: 'This is a test professional bio for image upload testing. I am testing the personal profile setup component with mock data.',
          yearsExperience: 5,
          specialties: ['Test Specialty 1', 'Test Specialty 2'],
          certifications: [],
          education: [],
          awards: [],
          socialLinks: {},
          avatarUrl: undefined,
          coverImageUrl: undefined
        });
      }

      const { data: profile, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching provider profile:', error);
        return res.status(500).json({ error: 'Failed to fetch provider profile' });
      }

      if (!profile) {
        // Return empty profile for new users
        return res.status(200).json({
          professionalTitle: '',
          professionalBio: '',
          yearsExperience: 0,
          specialties: [],
          certifications: [],
          education: [],
          awards: [],
          socialLinks: {},
          avatarUrl: undefined,
          coverImageUrl: undefined
        });
      }

      // Map providers table fields to expected format
      return res.status(200).json({
        professionalTitle: profile.provider_role || '',
        professionalBio: profile.bio || '',
        yearsExperience: profile.experience_years || 0,
        specialties: [], // Not stored in providers table yet
        certifications: [], // Not stored in providers table yet
        education: [], // Not stored in providers table yet
        awards: [], // Not stored in providers table yet
        socialLinks: {}, // Not stored in providers table yet
        avatarUrl: profile.image_url,
        coverImageUrl: profile.cover_image_url
      });
    } catch (error) {
      console.error('Error in provider profile GET:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        businessId,
        professionalTitle,
        professionalBio,
        yearsExperience,
        specialties,
        certifications,
        education,
        awards,
        socialLinks,
        avatarUrl,
        coverImageUrl
      } = req.body;

      // Handle test user IDs specially
      if (userId.startsWith('test-')) {
        return res.status(200).json({
          success: true,
          message: 'Test provider profile saved successfully',
          testMode: true
        });
      }

      // For Phase 2 onboarding, we look up provider by business_id, not user_id
      // This is because the business_id comes from the Phase 2 token
      if (!businessId || typeof businessId !== 'string') {
        return res.status(400).json({ error: 'businessId is required for provider profile update' });
      }

      // Check if owner provider exists for this business
      // Phase 2 onboarding is specifically for the business owner (first person to sign up)
      const { data: existingProfile, error: lookupError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role')
        .eq('business_id', businessId)
        .eq('provider_role', 'owner')
        .single();

      if (lookupError && lookupError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error looking up provider profile:', lookupError);
        return res.status(500).json({ error: 'Failed to look up provider profile' });
      }

      if (!existingProfile) {
        console.warn('Owner provider profile not found for business:', businessId);
        return res.status(404).json({ error: 'Owner provider profile not found for this business. Complete Phase 1 first.' });
      }

      // Map to providers table schema
      // Note: Schema has created_at but no updated_at field
      const profileData: Record<string, any> = {};
      
      // Only include fields that are defined and match schema
      if (professionalBio !== undefined) {
        profileData.bio = professionalBio || null;
      }
      if (yearsExperience !== undefined) {
        profileData.experience_years = yearsExperience || null;
      }
      if (avatarUrl !== undefined) {
        profileData.image_url = avatarUrl || null;
      }
      if (coverImageUrl !== undefined) {
        profileData.cover_image_url = coverImageUrl || null;
      }
      
      // Note: updated_at field doesn't exist in providers table schema

      // Update owner provider by business_id and provider_role
      // Phase 2 onboarding updates the business owner specifically
      const { error: updateError } = await supabase
        .from('providers')
        .update(profileData)
        .eq('business_id', businessId)
        .eq('provider_role', 'owner');

      if (updateError) {
        console.error('Error updating provider profile:', updateError);
        return res.status(500).json({ error: 'Failed to update provider profile' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in provider profile PUT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
