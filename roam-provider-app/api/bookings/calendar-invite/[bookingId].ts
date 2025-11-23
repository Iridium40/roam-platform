import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate iCal file content for calendar invite
 */
function generateICalFile(
  summary: string,
  description: string,
  location: string,
  startDate: Date,
  endDate: Date,
  organizerEmail: string = 'support@roamyourbestlife.com',
  organizerName: string = 'ROAM',
  attendeeEmail: string
): string {
  // Format dates in UTC (iCal format: YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Generate unique ID for the event
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@roamyourbestlife.com`;

  // Escape special characters in text fields
  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ROAM//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    `ORGANIZER;CN="${escapeText(organizerName)}":MAILTO:${organizerEmail}`,
    `ATTENDEE;CN="${escapeText(attendeeEmail)}";RSVP=TRUE:MAILTO:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Booking starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ical;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId } = req.query;

    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          user_id
        ),
        providers (
          id,
          first_name,
          last_name
        ),
        services (
          id,
          name,
          duration_minutes
        ),
        business_locations!bookings_business_location_id_fkey (
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        ),
        customer_locations!bookings_customer_location_id_fkey (
          street_address,
          unit_number,
          city,
          state,
          zip_code
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only allow if booking is confirmed/accepted
    if (booking.booking_status !== 'confirmed' && booking.booking_status !== 'accepted') {
      return res.status(403).json({ error: 'Booking is not confirmed' });
    }

    // Get location address
    const getLocationObject = (locationData: any) => {
      if (!locationData) return null;
      if (Array.isArray(locationData)) {
        return locationData.length > 0 ? locationData[0] : null;
      }
      return locationData;
    };

    const businessLocation = getLocationObject(booking.business_locations);
    const customerLocation = getLocationObject(booking.customer_locations);
    
    let locationAddress = '';
    if (businessLocation) {
      const parts = [
        businessLocation.address_line1,
        businessLocation.address_line2,
        businessLocation.city && businessLocation.state && businessLocation.postal_code 
          ? `${businessLocation.city}, ${businessLocation.state} ${businessLocation.postal_code}` 
          : null,
      ].filter(Boolean);
      locationAddress = parts.join(', ');
    } else if (customerLocation) {
      const parts = [
        customerLocation.street_address,
        customerLocation.unit_number,
        customerLocation.city && customerLocation.state && customerLocation.zip_code
          ? `${customerLocation.city}, ${customerLocation.state} ${customerLocation.zip_code}`
          : null,
      ].filter(Boolean);
      locationAddress = parts.join(', ');
    } else {
      locationAddress = 'Location TBD';
    }

    // Parse booking date and time
    if (!booking.booking_date || !booking.start_time) {
      return res.status(400).json({ error: 'Booking date or time is missing' });
    }

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    if (isNaN(bookingDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid booking date or time' });
    }

    // Get service duration (default to 60 minutes if not available)
    const durationMinutes = booking.services?.duration_minutes || booking.duration_minutes || 60;
    const endDateTime = new Date(bookingDateTime.getTime() + durationMinutes * 60000);

    // Get customer email
    const customer = Array.isArray(booking.customer_profiles) 
      ? booking.customer_profiles[0] 
      : booking.customer_profiles;
    const customerEmail = customer?.email || booking.guest_email || 'customer@roamyourbestlife.com';

    // Get provider name
    const provider = Array.isArray(booking.providers) 
      ? booking.providers[0] 
      : booking.providers;
    const providerName = provider 
      ? `${provider.first_name} ${provider.last_name}` 
      : 'Provider';

    // Get service name
    const serviceName = booking.services?.name || booking.service_name || 'Service';

    // Generate calendar summary and description
    const calendarSummary = `${serviceName} with ${providerName}`;
    const calendarDescription = `Service: ${serviceName}\nProvider: ${providerName}\n\nLocation: ${locationAddress}\n\nBooking ID: ${booking.id}`;

    // Generate ICS file
    const icalContent = generateICalFile(
      calendarSummary,
      calendarDescription,
      locationAddress,
      bookingDateTime,
      endDateTime,
      'support@roamyourbestlife.com',
      'ROAM',
      customerEmail
    );

    // Set headers for ICS file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${bookingId}.ics"`);
    
    return res.status(200).send(icalContent);

  } catch (error) {
    console.error('❌ Error generating calendar invite:', error);
    return res.status(500).json({
      error: 'Failed to generate calendar invite',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

