import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { testEmail, userId } = req.body;

  if (!testEmail) {
    return res.status(400).json({ error: 'testEmail is required' });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.VITE_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasTwilioPhone: !!(process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER),
    },
    tests: {},
  };

  // Test 1: Check Supabase Connection
  try {
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('notification_templates')
      .select('count')
      .limit(1);

    results.tests.supabase = {
      status: error ? 'failed' : 'passed',
      error: error?.message,
      message: error ? 'Cannot connect to Supabase' : 'Supabase connection OK',
    };
  } catch (error: any) {
    results.tests.supabase = {
      status: 'failed',
      error: error.message,
      message: 'Supabase connection failed',
    };
  }

  // Test 2: Check Notification Templates Exist
  try {
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: templates, error } = await supabase
      .from('notification_templates')
      .select('template_key, is_active')
      .eq('is_active', true);

    results.tests.templates = {
      status: error ? 'failed' : templates && templates.length === 8 ? 'passed' : 'warning',
      count: templates?.length || 0,
      expected: 8,
      templates: templates?.map(t => t.template_key),
      error: error?.message,
      message: templates && templates.length === 8
        ? 'All 8 templates found'
        : `Only ${templates?.length || 0} templates found (expected 8)`,
    };
  } catch (error: any) {
    results.tests.templates = {
      status: 'failed',
      error: error.message,
      message: 'Failed to query notification_templates',
    };
  }

  // Test 3: Check notification_logs table exists
  try {
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('notification_logs')
      .select('count')
      .limit(1);

    results.tests.logs_table = {
      status: error ? 'failed' : 'passed',
      error: error?.message,
      message: error ? 'notification_logs table missing or inaccessible' : 'notification_logs table OK',
    };
  } catch (error: any) {
    results.tests.logs_table = {
      status: 'failed',
      error: error.message,
      message: 'Failed to access notification_logs',
    };
  }

  // Test 4: Test Resend Email Send
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: 'ROAM Testing <providersupport@roamyourbestlife.com>',
        to: [testEmail],
        subject: '🧪 ROAM Notification System Test',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
              .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
              .logo { text-align: center; margin-bottom: 20px; }
              .logo img { max-width: 200px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM Logo" />
              </div>
              <h1>✅ Notification System Test</h1>
              <div class="success">
                <h2>🎉 Success!</h2>
                <p>Your ROAM notification system is working correctly.</p>
                <p><strong>Test Results:</strong></p>
                <ul>
                  <li>✅ Resend API: Connected</li>
                  <li>✅ Email Delivery: Working</li>
                  <li>✅ ROAM Logo: Displaying</li>
                </ul>
              </div>
              <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
              <p>If you received this email, your notification system is configured correctly!</p>
            </div>
          </body>
          </html>
        `,
      });

      results.tests.resend = {
        status: error ? 'failed' : 'passed',
        resend_id: data?.id,
        error: error?.message,
        message: error ? 'Resend email send failed' : `Test email sent successfully (ID: ${data?.id})`,
      };
    } catch (error: any) {
      results.tests.resend = {
        status: 'failed',
        error: error.message,
        message: 'Resend API test failed',
      };
    }
  } else {
    results.tests.resend = {
      status: 'skipped',
      message: 'RESEND_API_KEY not configured',
    };
  }

  // Test 5: Check user_settings for test user (if userId provided)
  if (userId) {
    try {
      const supabase = createClient(
        process.env.VITE_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      results.tests.user_settings = {
        status: error ? 'failed' : settings ? 'passed' : 'warning',
        found: !!settings,
        email_notifications: settings?.email_notifications,
        sms_notifications: settings?.sms_notifications,
        notification_email: settings?.notification_email || 'not set',
        notification_phone: settings?.notification_phone || 'not set',
        error: error?.message,
        message: settings
          ? 'User settings found'
          : error
          ? 'Error loading user settings'
          : 'User settings not found (will use defaults)',
      };
    } catch (error: any) {
      results.tests.user_settings = {
        status: 'failed',
        error: error.message,
        message: 'Failed to query user_settings',
      };
    }
  }

  // Summary
  const allTests = Object.values(results.tests);
  const passed = allTests.filter((t: any) => t.status === 'passed').length;
  const failed = allTests.filter((t: any) => t.status === 'failed').length;
  const warnings = allTests.filter((t: any) => t.status === 'warning').length;

  results.summary = {
    total: allTests.length,
    passed,
    failed,
    warnings,
    overall: failed === 0 ? (warnings === 0 ? 'PASS' : 'PASS_WITH_WARNINGS') : 'FAIL',
  };

  return res.status(200).json(results);
}

