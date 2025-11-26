import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleAddEnumValue(req: Request, res: Response) {
  try {
    const { function_name, new_value } = req.body;

    if (!function_name || !new_value) {
      return res.status(400).json({ error: 'Missing required fields: function_name and new_value' });
    }

    console.log(`[Database] Calling RPC function: ${function_name} with value: ${new_value}`);

    // Call the RPC function using service role key (bypasses RLS)
    const { data, error } = await supabase.rpc(function_name, {
      new_type: new_value,
    });

    if (error) {
      console.error('[Database] RPC error:', error);
      return res.status(500).json({ error: `RPC call failed: ${error.message}`, details: error });
    }

    console.log('[Database] RPC call successful:', data);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Database] Error in RPC handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

