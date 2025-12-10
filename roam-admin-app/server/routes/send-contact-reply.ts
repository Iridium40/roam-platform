import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

interface ContactReplyRequest {
  submissionId: string;
  replySubject: string;
  replyMessage: string;
  adminId?: string;
  adminEmail?: string;
}

export async function handleSendContactReply(req: Request, res: Response) {
  try {
    console.log('=== SEND CONTACT REPLY START ===');
    console.log('Request body:', req.body);

    const { submissionId, replySubject, replyMessage, adminId, adminEmail } = req.body as ContactReplyRequest;

    // Validate required fields
    if (!submissionId || !replySubject || !replyMessage) {
      return res.status(400).json({
        error: 'Missing required fields: submissionId, replySubject, and replyMessage are required'
      });
    }

    // Check environment variables
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Supabase configuration error'
      });
    }

    if (!resendApiKey) {
      return res.status(500).json({
        error: 'Email service configuration error: RESEND_API_KEY not found'
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the original contact submission
    const { data: submission, error: fetchError } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      console.error('Error fetching submission:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch contact submission',
        details: fetchError.message
      });
    }

    if (!submission) {
      return res.status(404).json({
        error: 'Contact submission not found'
      });
    }

    console.log('Found submission:', {
      id: submission.id,
      from_email: submission.from_email,
      subject: submission.subject
    });

    // Prepare email content
    const emailPayload = {
      from: process.env.RESEND_FROM_EMAIL || 'ROAM Support <contactus@roamyourbestlife.com>',
      to: [submission.from_email],
      subject: replySubject,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Response from ROAM Support</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { padding: 10px !important; }
              .content { padding: 20px !important; }
              .logo { max-width: 150px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
          <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header with Logo -->
            <div style="text-align: center; padding: 30px 0 20px;">
              <img src="https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/website-images/roam-logo-white.png"
                   alt="ROAM - Your Best Life. Everywhere."
                   class="logo"
                   style="max-width: 200px; height: auto;">
              <p style="margin: 10px 0 0; color: #4F46E5; font-size: 14px; font-weight: 600;">Your Best Life. Everywhere.</p>
            </div>

            <!-- Main Content -->
            <div class="content" style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

              <!-- Greeting -->
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                ${submission.full_name ? `Dear ${submission.full_name},` : 'Hello,'}
              </p>

              <!-- Response Message -->
              <div style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                ${replyMessage.replace(/\n/g, '<br>')}
              </div>

              <!-- Original Message Reference -->
              <div style="background: #f8fafc; border-left: 4px solid #4F46E5; padding: 20px; margin-bottom: 30px;">
                <h4 style="margin: 0 0 8px; color: #4F46E5; font-size: 16px; font-weight: 600;">📝 Your Original Message</h4>
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;"><strong>Subject:</strong> ${submission.subject}</p>
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;"><strong>Date:</strong> ${new Date(submission.created_at).toLocaleDateString()}</p>
                <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 6px; color: #334155; font-size: 14px; line-height: 1.5;">
                  ${submission.message.replace(/\n/g, '<br>')}
                </div>
              </div>

              <!-- Contact Information -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h4 style="color: #15803d; margin: 0 0 12px; font-size: 16px; font-weight: 600;">💬 Need Further Assistance?</h4>
                <p style="margin: 0; color: #166534; line-height: 1.5;">
                  If you have any additional questions or need further clarification, please don't hesitate to reply to this email or contact us directly.
                </p>
              </div>

              <!-- Support Information -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                <h4 style="color: #4F46E5; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Get in Touch</h4>
                <div style="margin-bottom: 12px;">
                  <p style="margin: 0; color: #4F46E5; font-weight: 600;">
                    📧 <a href="mailto:support@roamyourbestlife.com" style="color: #4F46E5; text-decoration: none;">support@roamyourbestlife.com</a>
                  </p>
                </div>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  We're here to help make your ROAM experience amazing!
                </p>
              </div>

            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 20px; color: #64748b; font-size: 14px;">
              <p style="margin: 0 0 10px;">Thank you for contacting ROAM!</p>
              <p style="margin: 0; font-weight: 600;">ROAM Support Team</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  © ${new Date().getFullYear()} ROAM. All rights reserved.<br>
                  <a href="https://roamyourbestlife.com/privacy" style="color: #4F46E5; text-decoration: none;">Privacy Policy</a> |
                  <a href="https://roamyourbestlife.com/terms" style="color: #4F46E5; text-decoration: none;">Terms of Service</a>
                </p>
              </div>
            </div>

          </div>
        </body>
        </html>
      `,
    };

    console.log('Sending reply email via Resend to:', submission.from_email);

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await resendResponse.json();
      } catch (e) {
        errorDetails = await resendResponse.text();
      }

      console.error('Failed to send reply email. Status:', resendResponse.status);
      console.error('Error details:', errorDetails);

      return res.status(500).json({
        error: 'Failed to send reply email',
        details: errorDetails,
        statusCode: resendResponse.status
      });
    }

    const emailResult = await resendResponse.json();
    console.log('Reply email sent successfully:', emailResult);

    // Update the contact submission status and add response information
    const { error: updateError } = await supabase
      .from('contact_submissions')
      .update({
        status: 'responded',
        responded_at: new Date().toISOString(),
        responded_by: adminId || null,
        notes: `Reply sent: ${replySubject}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission status:', updateError);
      // Don't fail the request since email was sent successfully
    }

    console.log('=== SEND CONTACT REPLY END ===');
    return res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      emailId: emailResult.id
    });

  } catch (error) {
    console.error('Error in handleSendContactReply:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      error: 'Internal server error while sending reply',
      details: errorMessage
    });
  }
}