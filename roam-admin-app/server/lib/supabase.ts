import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://vssomyuyhicaxsgiaupo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1MzcxNSwiZXhwIjoyMDY5MDI5NzE1fQ.54i9VPExknTktnWbyT9Z9rZKvSJOjs9fG60wncLhLlA';

export const supabase = createClient(supabaseUrl, supabaseKey);
