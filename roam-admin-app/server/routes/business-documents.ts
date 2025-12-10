import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBusinessDocuments(req: Request, res: Response) {
  // Route to appropriate handler based on method
  switch (req.method) {
    case 'GET':
      return getBusinessDocuments(req, res);
    case 'PUT':
      return updateBusinessDocument(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET handler - fetch business documents
async function getBusinessDocuments(req: Request, res: Response) {
  try {
    console.log('[Business Documents API] ===== START =====');
    console.log('[Business Documents API] Request method:', req.method);
    console.log('[Business Documents API] Request URL:', req.url);
    console.log('[Business Documents API] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Business Documents API] Request query:', req.query);
    
    const { business_id } = req.query;

    console.log('[Business Documents API] business_id extracted:', business_id);
    console.log('[Business Documents API] business_id type:', typeof business_id);

    // If no business_id provided, return all documents (for admin aggregation)
    if (!business_id) {
      console.log('[Business Documents API] No business_id - fetching all documents for admin');
      const { data: allDocuments, error: documentsError } = await supabase
        .from('business_documents')
        .select('business_id, verification_status, id, document_type, created_at')
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('[Business Documents API] All documents fetch error:', documentsError);
        return res.status(500).json({ 
          error: documentsError.message,
          details: documentsError.details
        });
      }

      console.log('[Business Documents API] All documents fetched successfully:', allDocuments?.length || 0);
      return res.status(200).json({ 
        data: allDocuments || [],
        count: allDocuments?.length || 0
      });
    }

    if (typeof business_id !== 'string') {
      console.error('[Business Documents API] Invalid business_id type');
      return res.status(400).json({ 
        error: 'business_id must be a string' 
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

    // Debug environment variables
    console.log('[Business Documents API] Environment check:');
    console.log('[Business Documents API] SUPABASE_URL exists:', !!process.env.VITE_PUBLIC_SUPABASE_URL);
    console.log('[Business Documents API] SUPABASE_URL length:', process.env.VITE_PUBLIC_SUPABASE_URL?.length);
    console.log('[Business Documents API] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[Business Documents API] SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
    console.log('[Business Documents API] SERVICE_ROLE_KEY prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));

    // Test Supabase connection
    console.log('[Business Documents API] Testing Supabase connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('business_profiles')
        .select('count')
        .limit(1);
      
      console.log('[Business Documents API] Supabase test result:', {
        hasData: !!testData,
        hasError: !!testError,
        errorMessage: testError?.message
      });
    } catch (testErr) {
      console.error('[Business Documents API] Supabase connection test failed:', testErr);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: testErr instanceof Error ? testErr.message : 'Unknown connection error'
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

    console.log('[Business Documents API] ===== SUCCESS =====');
    console.log('[Business Documents API] Returning response with', documents?.length || 0, 'documents');

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

// PUT handler - update business document verification status
async function updateBusinessDocument(req: Request, res: Response) {
  try {
    console.log('[Business Documents API] ===== UPDATE START =====');
    console.log('[Business Documents API] Request body:', req.body);

    // Frontend sends: { id, verification_status, verified_by, verified_at, rejection_reason }
    // NOTE: verified_by from frontend is auth.users.id, but FK requires admin_users.id
    const { id, verification_status, verified_by, verified_at, rejection_reason } = req.body;

    if (!id) {
      return res.status(400).json({ 
        error: 'Missing required field: id' 
      });
    }

    // Validate id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid id format - must be a valid UUID' 
      });
    }

    // Build the update object with allowed fields
    const updateData: Record<string, any> = {};
    
    if (verification_status !== undefined) {
      updateData.verification_status = verification_status;
    }
    
    // If verified_by is provided (auth.users.id), look up the admin_users.id
    if (verified_by !== undefined) {
      if (verified_by === null) {
        updateData.verified_by = null;
      } else {
        // Look up admin_users record by user_id (auth.users.id)
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', verified_by)
          .single();

        if (adminError || !adminUser) {
          console.error('[Business Documents API] Admin user lookup error:', adminError);
          return res.status(400).json({ 
            error: 'Failed to find admin user record for the current user',
            details: adminError?.message
          });
        }

        console.log('[Business Documents API] Found admin_users.id:', adminUser.id, 'for auth.users.id:', verified_by);
        updateData.verified_by = adminUser.id;
      }
    }
    
    if (verified_at !== undefined) {
      updateData.verified_at = verified_at;
    }
    if (rejection_reason !== undefined) {
      updateData.rejection_reason = rejection_reason;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update'
      });
    }

    console.log('[Business Documents API] Updating document:', id);
    console.log('[Business Documents API] Update data:', updateData);

    // Update the document
    const { data: updatedDocument, error: updateError } = await supabase
      .from('business_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Business Documents API] Update error:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details,
        code: updateError.code
      });
    }

    console.log('[Business Documents API] Document updated successfully:', updatedDocument);
    console.log('[Business Documents API] ===== UPDATE SUCCESS =====');

    return res.status(200).json({ 
      success: true,
      data: updatedDocument,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('[Business Documents API] Update unexpected error:', error);
    return res.status(500).json({ 
      error: 'Failed to update business document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
