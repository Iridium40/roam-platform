import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const ROAM_EMAIL_CONFIG = {
  logoUrl: "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200",
  brandColor: "#4F46E5", // roam-blue
  fromEmail: "providersupport@roamyourbestlife.com",
  fromName: "ROAM Provider Support",
  supportEmail: "contactus@roamyourbestlife.com",
};

// Email template for contact form submission
function getContactFormEmailTemplate(
  name: string,
  email: string,
  phone: string | null,
  message: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - ROAM</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .email-container {
          background-color: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #f5f5f5;
          color: #333333;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin: -40px -40px 30px -40px;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 200px;
          height: auto;
        }
        .content {
          margin-bottom: 30px;
        }
        .info-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .field {
          margin-bottom: 15px;
        }
        .field-label {
          font-weight: 600;
          color: ${ROAM_EMAIL_CONFIG.brandColor};
          margin-bottom: 5px;
        }
        .field-value {
          color: #333;
        }
        h1, h2, h3 {
          color: ${ROAM_EMAIL_CONFIG.brandColor};
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">
            <img src="${ROAM_EMAIL_CONFIG.logoUrl}" alt="ROAM - Your Best Life. Everywhere." />
          </div>
        </div>
        <div class="content">
          <h1>New Contact Form Submission</h1>
          <p>You have received a new message from the provider contact form.</p>
          
          <div class="info-box">
            <div class="field">
              <div class="field-label">Name:</div>
              <div class="field-value">${name}</div>
            </div>
            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${phone ? `
            <div class="field">
              <div class="field-label">Phone:</div>
              <div class="field-value">${phone}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="field-label">Message:</div>
              <div class="field-value" style="white-space: pre-wrap; margin-top: 10px;">${message}</div>
            </div>
          </div>
          
          <p style="margin-top: 30px;">
            <strong>Next Steps:</strong><br>
            Please respond to this inquiry within one business day. You can reply directly to ${email}.
          </p>
        </div>
        <div class="footer">
          <p>This email was sent from the ROAM Provider Portal contact form.</p>
          <p>© 2024 ROAM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Name, email, and message are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format'
      });
    }

    console.log('📧 Sending contact form email:', { name, email, phone: phone || 'not provided' });

    // Send email to support team
    if (process.env.RESEND_API_KEY) {
      const emailHtml = getContactFormEmailTemplate(name, email, phone || null, message);

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `${ROAM_EMAIL_CONFIG.fromName} <${ROAM_EMAIL_CONFIG.fromEmail}>`,
        to: [ROAM_EMAIL_CONFIG.supportEmail],
        replyTo: email, // Allow replying directly to the sender
        subject: `New Contact Form Submission from ${name}`,
        html: emailHtml,
      });

      if (emailError) {
        console.error('❌ Resend error:', emailError);
        return res.status(500).json({ 
          error: 'Failed to send email',
          details: emailError.message
        });
      }

      console.log('✅ Contact form email sent successfully:', emailData?.id);
    } else {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email send');
      // In development, still return success
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Would send email to:', ROAM_EMAIL_CONFIG.supportEmail);
      } else {
        return res.status(500).json({ 
          error: 'Email service not configured'
        });
      }
    }

    return res.status(200).json({ 
      ok: true,
      message: 'Message sent successfully. We\'ll get back to you within one business day.'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

