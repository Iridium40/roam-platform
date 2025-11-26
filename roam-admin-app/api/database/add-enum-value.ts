import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { function_name, new_value } = req.body;

    if (!function_name || !new_value) {
      return res.status(400).json({ error: 'Missing required fields: function_name and new_value' });
    }

    console.log(`Calling RPC function: ${function_name} with value: ${new_value}`);

    // Call the RPC function using service role key (bypasses RLS)
    const { data, error } = await supabase.rpc(function_name, {
      new_type: new_value,
    });

    if (error) {
      console.error('RPC error:', error);
      return res.status(500).json({ error: `RPC call failed: ${error.message}`, details: error });
    }

    console.log('RPC call successful:', data);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in RPC handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

