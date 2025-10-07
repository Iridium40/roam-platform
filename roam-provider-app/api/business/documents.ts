import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/business/documents
 * 
 * Manages business documents for verification and compliance.
 * Documents are stored in Supabase storage and metadata in business_documents table.
 * 
 * Storage bucket: 'provider-documents'
 * Path pattern: provider-documents/{business_id}/{document_type}_{timestamp}.{ext}
 * 
 * Methods:
 * - GET: Fetch all documents for a business
 * - POST: Upload a new document (file + metadata)
 * - DELETE: Remove a document (file + metadata)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // GET - Fetch all documents for a business
    if (req.method === 'GET') {
      const { business_id } = req.query;

      if (!business_id || typeof business_id !== 'string') {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      // Fetch documents with admin user info for verified_by field
      const { data: documents, error: documentsError } = await supabase
        .from('business_documents')
        .select(`
          id,
          business_id,
          document_type,
          document_name,
          file_url,
          file_size_bytes,
          verification_status,
          verified_by,
          verified_at,
          rejection_reason,
          expiry_date,
          created_at,
          admin_users (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('business_id', business_id)
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('Error fetching business documents:', documentsError);
        return res.status(500).json({ error: 'Failed to fetch documents', details: documentsError.message });
      }

      // Transform response to match frontend expectations
      const transformedDocuments = (documents || []).map((doc: any) => ({
        id: doc.id,
        business_id: doc.business_id,
        document_type: doc.document_type,
        document_name: doc.document_name,
        document_url: doc.file_url,
        file_url: doc.file_url,
        file_size_bytes: doc.file_size_bytes,
        upload_status: doc.verification_status || 'pending',
        verification_status: doc.verification_status || 'pending',
        verified_by: doc.verified_by,
        verified_at: doc.verified_at,
        rejection_reason: doc.rejection_reason,
        expiry_date: doc.expiry_date,
        uploaded_at: doc.created_at,
        created_at: doc.created_at,
        original_filename: doc.document_name,
        verifier: doc.admin_users ? {
          id: doc.admin_users.id,
          name: `${doc.admin_users.first_name} ${doc.admin_users.last_name}`.trim(),
          email: doc.admin_users.email
        } : null
      }));

      return res.status(200).json({
        business_id,
        document_count: transformedDocuments.length,
        documents: transformedDocuments
      });
    }

    // POST - Upload a new document
    if (req.method === 'POST') {
      const { 
        business_id, 
        document_type, 
        document_name, 
        file_url, 
        file_size_bytes,
        expiry_date 
      } = req.body;

      if (!business_id || !document_type || !document_name || !file_url) {
        return res.status(400).json({ 
          error: 'business_id, document_type, document_name, and file_url are required' 
        });
      }

      // Validate business exists
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', business_id)
        .single();

      if (businessError || !business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Insert document record
      const { data: newDocument, error: insertError } = await supabase
        .from('business_documents')
        .insert({
          business_id,
          document_type,
          document_name,
          file_url,
          file_size_bytes: file_size_bytes || null,
          expiry_date: expiry_date || null,
          verification_status: 'pending',
          verified_by: null,
          verified_at: null,
          rejection_reason: null
        })
        .select(`
          id,
          business_id,
          document_type,
          document_name,
          file_url,
          file_size_bytes,
          verification_status,
          verified_by,
          verified_at,
          rejection_reason,
          expiry_date,
          created_at
        `)
        .single();

      if (insertError) {
        console.error('Error inserting document:', insertError);
        return res.status(500).json({ error: 'Failed to save document', details: insertError.message });
      }

      // Transform response
      const transformedDocument = {
        id: newDocument.id,
        business_id: newDocument.business_id,
        document_type: newDocument.document_type,
        document_name: newDocument.document_name,
        document_url: newDocument.file_url,
        file_url: newDocument.file_url,
        file_size_bytes: newDocument.file_size_bytes,
        upload_status: newDocument.verification_status,
        verification_status: newDocument.verification_status,
        verified_by: newDocument.verified_by,
        verified_at: newDocument.verified_at,
        rejection_reason: newDocument.rejection_reason,
        expiry_date: newDocument.expiry_date,
        uploaded_at: newDocument.created_at,
        created_at: newDocument.created_at,
        original_filename: newDocument.document_name,
        verifier: null
      };

      return res.status(201).json({
        message: 'Document uploaded successfully',
        document: transformedDocument
      });
    }

    // DELETE - Remove a document
    if (req.method === 'DELETE') {
      const { business_id, document_id } = req.query;

      if (!business_id || !document_id) {
        return res.status(400).json({ 
          error: 'business_id and document_id query parameters are required' 
        });
      }

      // Get document info first to delete from storage
      const { data: document, error: fetchError } = await supabase
        .from('business_documents')
        .select('id, file_url, business_id')
        .eq('id', document_id)
        .eq('business_id', business_id)
        .single();

      if (fetchError || !document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Extract file path from URL for storage deletion
      // URL format: https://{project}.supabase.co/storage/v1/object/public/provider-documents/{path}
      const urlParts = document.file_url.split('/provider-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage (non-blocking, best effort)
        try {
          const { error: storageError } = await supabase.storage
            .from('roam-file-storage')
            .remove([filePath]);
          
          if (storageError) {
            console.warn('Warning: Failed to delete file from storage:', storageError);
            // Continue with database deletion even if storage fails
          }
        } catch (storageErr) {
          console.warn('Warning: Storage deletion error:', storageErr);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('business_documents')
        .delete()
        .eq('id', document_id)
        .eq('business_id', business_id);

      if (deleteError) {
        console.error('Error deleting document:', deleteError);
        return res.status(500).json({ error: 'Failed to delete document', details: deleteError.message });
      }

      return res.status(200).json({
        message: 'Document deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
