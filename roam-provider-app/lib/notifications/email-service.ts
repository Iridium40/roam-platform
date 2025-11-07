import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  id: string;
  success: boolean;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured');
      throw new Error('Email service not configured');
    }

    const { data, error } = await resend.emails.send({
      from: params.from || 'ROAM Notifications <notifications@roamyourbestlife.com>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    console.log('✅ Email sent successfully:', data?.id);

    return {
      id: data?.id || '',
      success: true,
    };
  } catch (error) {
    console.error('❌ Email service error:', error);
    throw error;
  }
}

