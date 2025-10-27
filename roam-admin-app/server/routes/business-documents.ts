import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handleBusinessDocuments(req: Request, res: Response) {
  try {
    const { business_id } = req.query;

    console.log('[Business Documents API] GET request received');
    console.log('[Business Documents API] business_id:', business_id);

    if (!business_id || typeof business_id !== 'string') {
      console.error('[Business Documents API] Missing or invalid business_id');
      return res.status(400).json({ 
        error: 'business_id query parameter is required' 
      });
    }

    // Validate business_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(business_id)) {
      console.error('[Business Documents API] Invalid business_id format:', business_id);
      return res.status(400).json({ 
        error: 'Invalid business_id format - must be a valid UUID' 
      });
    }


    // First, verify the business exists
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', business_id)
      .single();

    console.log('[Business Documents API] Business lookup:', {
      found: !!business,
      name: business?.business_name,
      error: businessError?.message
    });

    if (businessError) {
      console.error('[Business Documents API] Business lookup error:', businessError);
      console.error('[Business Documents API] Business error details:', JSON.stringify(businessError, null, 2));
      if (businessError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Business not found',
          business_id 
        });
      }
      return res.status(500).json({ 
        error: businessError.message,
        details: businessError.details,
        hint: businessError.hint,
        code: businessError.code
      });
    }

    // Fetch business documents using service role (should bypass RLS)
    console.log('[Business Documents API] Fetching documents with service role...');
    const { data: documents, error: documentsError } = await supabase
      .from('business_documents')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('[Business Documents API] Documents fetch error:', documentsError);
      console.error('[Business Documents API] Documents error details:', JSON.stringify(documentsError, null, 2));
      return res.status(500).json({ 
        error: documentsError.message,
        details: documentsError.details,
        hint: documentsError.hint,
        code: documentsError.code
      });
    }

    console.log('[Business Documents API] Documents fetched successfully:', {
      business_id,
      business_name: business.business_name,
      document_count: documents?.length || 0,
      documents: documents?.map(d => ({
        id: d.id,
        document_type: d.document_type,
        document_name: d.document_name,
        has_file_url: !!d.file_url,
        file_url_prefix: d.file_url?.substring(0, 50),
        verification_status: d.verification_status,
        created_at: d.created_at
      }))
    });

    return res.status(200).json({ 
      data: documents || [],
      business: {
        id: business.id,
        name: business.business_name
      },
      count: documents?.length || 0
    });

  } catch (error) {
    console.error('[Business Documents API] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch business documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
