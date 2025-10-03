#!/usr/bin/env node

// Quick test script to check if business has services and addons
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from current directory
dotenv.config({ path: join(__dirname, '.env') });

const businessId = 'a3b483e5-b375-4a83-8c1e-223452f23397';

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('VITE_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBusinessData() {
  console.log('\n=== Checking Business Data ===');
  console.log('Business ID:', businessId);
  console.log('');

  // Check business_services
  console.log('1. Checking business_services...');
  const { data: services, error: servicesError } = await supabase
    .from('business_services')
    .select('*')
    .eq('business_id', businessId);
  
  if (servicesError) {
    console.error('❌ Error fetching business_services:', servicesError);
  } else {
    console.log(`✅ Found ${services?.length || 0} services`);
    if (services && services.length > 0) {
      console.log('   Service IDs:', services.map(s => s.service_id));
      console.log('   Active services:', services.filter(s => s.is_active).length);
    }
  }

  // Check service_addon_eligibility for those services
  if (services && services.length > 0) {
    const serviceIds = services.map(s => s.service_id);
    console.log('\n2. Checking service_addon_eligibility...');
    const { data: eligibility, error: eligError } = await supabase
      .from('service_addon_eligibility')
      .select('*')
      .in('service_id', serviceIds);
    
    if (eligError) {
      console.error('❌ Error fetching service_addon_eligibility:', eligError);
    } else {
      console.log(`✅ Found ${eligibility?.length || 0} addon eligibility records`);
      if (eligibility && eligibility.length > 0) {
        const addonIds = [...new Set(eligibility.map(e => e.addon_id))];
        console.log('   Unique addon IDs:', addonIds);
      }
    }

    // Check service_addons
    if (eligibility && eligibility.length > 0) {
      const addonIds = [...new Set(eligibility.map(e => e.addon_id))];
      console.log('\n3. Checking service_addons...');
      const { data: addons, error: addonsError } = await supabase
        .from('service_addons')
        .select('*')
        .in('id', addonIds);
      
      if (addonsError) {
        console.error('❌ Error fetching service_addons:', addonsError);
      } else {
        console.log(`✅ Found ${addons?.length || 0} add-ons`);
        if (addons && addons.length > 0) {
          addons.forEach(addon => {
            console.log(`   - ${addon.name} (${addon.id}) - Active: ${addon.is_active}`);
          });
        }
      }
    }
  }

  // Check business_addons
  console.log('\n4. Checking business_addons...');
  const { data: businessAddons, error: businessAddonsError } = await supabase
    .from('business_addons')
    .select('*')
    .eq('business_id', businessId);
  
  if (businessAddonsError) {
    console.error('❌ Error fetching business_addons:', businessAddonsError);
  } else {
    console.log(`✅ Found ${businessAddons?.length || 0} business add-on configurations`);
    if (businessAddons && businessAddons.length > 0) {
      businessAddons.forEach(ba => {
        console.log(`   - Addon ${ba.addon_id}: $${ba.custom_price}, Available: ${ba.is_available}`);
      });
    }
  }

  console.log('\n=== End of Check ===\n');
}

checkBusinessData().catch(console.error);
