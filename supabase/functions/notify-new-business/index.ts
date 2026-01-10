// Supabase Edge Function: notify-new-business
// Triggered by database INSERT on business_profiles table
// Sends notification email to admin when a new business is created

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Types
interface BusinessRecord {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: string;
  business_description: string | null;
  website_url: string | null;
  created_at: string;
}

// Send email via Resend
async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ROAM <noreply@roamyourbestlife.com>',
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Email sent to ${to}:`, result.id);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return false;
  }
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

// Format business type for display
function formatBusinessType(type: string): string {
  const typeMap: Record<string, string> = {
    'independent': 'Independent',
    'small_business': 'Small Business',
    'franchise': 'Franchise',
    'enterprise': 'Enterprise',
    'other': 'Other',
  };
  return typeMap[type] || type;
}

Deno.serve(async (req) => {
  try {
    // Parse the request body
    const { record, type } = await req.json();

    // Only process INSERT events
    if (type !== 'INSERT') {
      return new Response(
        JSON.stringify({ message: 'Ignoring non-INSERT event' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const business: BusinessRecord = record;
    console.log(`📧 Processing new business notification for: ${business.business_name} (${business.id})`);

    // Admin email to notify
    const adminEmail = 'alan@roamyourbestlife.com';

    // Build the email content
    const emailSubject = `🎉 New Business Created: ${business.business_name}`;
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Business Created</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    <h2 style="color: #4F46E5; margin-top: 0;">${business.business_name}</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 140px;">Business ID:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-family: monospace; font-size: 12px;">${business.id}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Type:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${formatBusinessType(business.business_type)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Contact Email:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
          ${business.contact_email ? `<a href="mailto:${business.contact_email}" style="color: #4F46E5;">${business.contact_email}</a>` : '<span style="color: #999;">Not provided</span>'}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Phone:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${business.phone || '<span style="color: #999;">Not provided</span>'}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Website:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
          ${business.website_url ? `<a href="${business.website_url}" style="color: #4F46E5;">${business.website_url}</a>` : '<span style="color: #999;">Not provided</span>'}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Status:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
          <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${business.verification_status.toUpperCase()}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-weight: 600;">Created At:</td>
        <td style="padding: 12px 0;">${formatDate(business.created_at)}</td>
      </tr>
    </table>
    
    ${business.business_description ? `
    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
      <h4 style="margin: 0 0 10px 0; color: #4F46E5;">Description</h4>
      <p style="margin: 0; color: #666;">${business.business_description}</p>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="https://admin.roamyourbestlife.com/businesses" 
         style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View in Admin Dashboard
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>This is an automated notification from ROAM Platform.</p>
  </div>
</body>
</html>
    `;

    const emailText = `
New Business Created: ${business.business_name}

Business ID: ${business.id}
Type: ${formatBusinessType(business.business_type)}
Contact Email: ${business.contact_email || 'Not provided'}
Phone: ${business.phone || 'Not provided'}
Website: ${business.website_url || 'Not provided'}
Status: ${business.verification_status}
Created At: ${formatDate(business.created_at)}

${business.business_description ? `Description:\n${business.business_description}` : ''}

View in Admin Dashboard: https://admin.roamyourbestlife.com/businesses

---
This is an automated notification from ROAM Platform.
    `;

    // Send the email
    const emailSent = await sendEmailViaResend(
      adminEmail,
      emailSubject,
      emailHtml,
      emailText
    );

    console.log(`✅ New business notification complete for ${business.business_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        businessId: business.id,
        businessName: business.business_name,
        emailSent,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in notify-new-business:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
