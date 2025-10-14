import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Use a stable supported API version (matches installed stripe types)
    apiVersion: '2023-10-16'
  });

  const supabase = createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { sessionId, userId, businessId } = req.query as Record<string, string | string[]>;

    const sessionIdVal = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    const userIdVal = Array.isArray(userId) ? userId[0] : userId;
    const businessIdVal = Array.isArray(businessId) ? businessId[0] : businessId;

    if (!sessionIdVal && !userIdVal) {
      return res.status(400).json({ error: 'Missing sessionId or userId' });
    }

    let verificationSession: Stripe.Identity.VerificationSession;
    let dbRecord: any = null;

    if (sessionIdVal) {
      verificationSession = await stripe.identity.verificationSessions.retrieve(sessionIdVal);
      const { data: dbData } = await supabase
        .from('stripe_identity_verifications')
        .select('*')
        .eq('session_id', sessionIdVal)
        .single();
      dbRecord = dbData;
    } else {
      const { data: dbData, error: dbError } = await supabase
        .from('stripe_identity_verifications')
        .select('*')
        .eq('user_id', userIdVal as string)
        .eq('business_id', businessIdVal as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbError || !dbData) {
        return res.status(404).json({ error: 'No verification session found' });
      }
      dbRecord = dbData;
      verificationSession = await stripe.identity.verificationSessions.retrieve(dbData.session_id);
    }

    const updateData: any = {
      status: verificationSession.status,
      updated_at: new Date().toISOString()
    };

    if (verificationSession.status === 'verified' && verificationSession.last_verification_report) {
      const verificationReport = await stripe.identity.verificationReports.retrieve(
        verificationSession.last_verification_report as string
      );
      updateData.verification_report = {
        id: verificationReport.id,
        type: verificationReport.type,
        created: verificationReport.created,
        document: verificationReport.document ? {
          type: verificationReport.document.type,
          status: verificationReport.document.status
        } : null,
        selfie: verificationReport.selfie ? { status: verificationReport.selfie.status } : null
      };
      updateData.verified_at = new Date().toISOString();

      if (dbRecord) {
        await supabase
          .from('business_profiles')
          .update({
            identity_verified: true,
            identity_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', dbRecord.business_id);

        await supabase
          .from('providers')
          .update({
            identity_verification_status: 'verified',
            updated_at: new Date().toISOString()
          })
          .eq('business_id', dbRecord.business_id);
      }
    } else if (verificationSession.status === 'requires_input' || verificationSession.status === 'canceled') {
      updateData.failed_at = new Date().toISOString();
    }

    if (dbRecord) {
      const { error: updateError } = await supabase
        .from('stripe_identity_verifications')
        .update(updateData)
        .eq('session_id', verificationSession.id);
      if (updateError) {
        console.error('Error updating verification record:', updateError);
      }
    }

    return res.status(200).json({
      verification_session: {
        id: verificationSession.id,
        status: verificationSession.status,
        type: verificationSession.type,
        created: verificationSession.created,
        client_secret: verificationSession.status === 'requires_input' ? verificationSession.client_secret : null,
        last_verification_report: updateData.verification_report
      }
    });
  } catch (error: any) {
    console.error('Stripe Identity verification status check error:', error);
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'Stripe error',
        details: error.message,
        type: error.type
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
