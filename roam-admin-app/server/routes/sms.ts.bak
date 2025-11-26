import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleTestSMS(req: Request, res: Response) {
  try {
    // Placeholder for SMS test functionality
    return res.status(200).json({ 
      success: true,
      message: 'SMS test endpoint' 
    });
  } catch (error) {
    console.error('Error in handleTestSMS:', error);
    return res.status(500).json({ error: 'Failed to send test SMS' });
  }
}

export async function handleGetSMSSettings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Get SMS settings for admin user
    const { data, error } = await supabase
      .from('user_settings')
      .select('sms_notifications')
      .eq('user_id', id)
      .single();
    
    if (error) {
      console.error('Error fetching SMS settings:', error);
      return res.status(500).json({ error: 'Failed to fetch SMS settings' });
    }
    
    return res.status(200).json({ 
      success: true,
      settings: data 
    });
  } catch (error) {
    console.error('Error in handleGetSMSSettings:', error);
    return res.status(500).json({ error: 'Failed to fetch SMS settings' });
  }
}
