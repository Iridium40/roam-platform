import { supabase } from "@/lib/supabase";
import { logger } from '@/utils/logger';

export const testBookingQueries = async () => {
  logger.debug("=== Testing Booking Queries ===");

  // Test 0: Check table existence with simple counts
  logger.debug("0. Checking basic table access...");
  try {
    const { count: customerCount, error: customerCountError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    logger.debug("Customers table:", customerCountError ? customerCountError : `${customerCount} records`);

    const { count: bookingCount, error: bookingCountError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    logger.debug("Bookings table:", bookingCountError ? bookingCountError : `${bookingCount} records`);

    const { count: serviceCount, error: serviceCountError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });
    logger.debug("Services table:", serviceCountError ? serviceCountError : `${serviceCount} records`);

    const { count: providerCount, error: providerCountError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true });
    logger.debug("Providers table:", providerCountError ? providerCountError : `${providerCount} records`);
  } catch (e) {
    logger.error("Table access error:", e);
  }

  // Test 1: Check if customers table has the test customer
  logger.debug("1. Checking customers table...");
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', 'customer@roamyourbestlife.com');

  if (customerError) {
    logger.error("Customer query error:", customerError);
  } else {
    logger.debug("Customer data:", customers);
  }

  // Test 2: Check current user session
  logger.debug("2. Checking current user session...");
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    logger.error("Session error:", sessionError);
  } else {
    logger.debug("Current session:", session?.session?.user?.email);
  }

  // Test 3: Check all bookings
  logger.debug("3. Checking all bookings...");
  const { data: allBookings, error: allBookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(10);

  if (allBookingsError) {
    logger.error("All bookings query error:", allBookingsError);
  } else {
    logger.debug("All bookings:", allBookings);
  }

  // Test 4: Check bookings by guest email
  logger.debug("4. Checking bookings by guest email...");
  const { data: guestBookings, error: guestError } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_email', 'customer@roamyourbestlife.com');

  if (guestError) {
    logger.error("Guest bookings query error:", guestError);
  } else {
    logger.debug("Guest bookings:", guestBookings);
  }

  // Test 5: Check services table
  logger.debug("5. Checking services table...");
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .limit(5);

  if (servicesError) {
    logger.error("Services query error:", servicesError);
  } else {
    logger.debug("Services:", services);
  }

  // Test 6: Check providers table
  logger.debug("6. Checking providers table...");
  const { data: providers, error: providersError } = await supabase
    .from('providers')
    .select('*')
    .limit(5);

  if (providersError) {
    logger.error("Providers query error:", providersError);
  } else {
    logger.debug("Providers:", providers);
  }

  logger.debug("=== End Testing ===");
};

// Auto-run the test when imported
if (typeof window !== 'undefined') {
  testBookingQueries();
}
