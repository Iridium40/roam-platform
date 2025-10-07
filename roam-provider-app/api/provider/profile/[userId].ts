import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    try {
      // Handle test user IDs specially
      if (userId.startsWith('test-')) {
        console.log('Test mode: Returning mock provider profile for', userId);
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
        console.log('Test mode: Simulating provider profile save for', userId);
        console.log('Provider data:', {
          professionalTitle,
          professionalBio,
          yearsExperience,
          specialties,
          avatarUrl,
          coverImageUrl
        });
        return res.status(200).json({
          success: true,
          message: 'Test provider profile saved successfully',
          testMode: true
        });
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Map to providers table schema
      const profileData = {
        bio: professionalBio,
        experience_years: yearsExperience,
        image_url: avatarUrl,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('providers')
          .update(profileData)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating provider profile:', updateError);
          return res.status(500).json({ error: 'Failed to update provider profile' });
        }
      } else {
        // Provider should already exist from Phase 1, but handle edge case
        console.warn('Provider profile not found for user:', userId);
        return res.status(404).json({ error: 'Provider profile not found. Complete Phase 1 first.' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in provider profile PUT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
