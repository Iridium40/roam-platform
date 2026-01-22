import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const search = (req.query.search as string) || "";

    // Pull baseline business list
    let businessQuery = supabase
      .from("business_profiles")
      .select("id, business_name, business_type, verification_status, is_active, contact_email, phone, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      businessQuery = businessQuery.or(
        `business_name.ilike.%${search}%,contact_email.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    const { data: businesses, error: bizError } = await businessQuery;
    if (bizError) throw bizError;

    const businessIds = (businesses || []).map((b: any) => b.id).filter(Boolean);

    // Helper: chunk arrays for PostgREST IN() limits
    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    // Load staff (owner + provider roles) for all businesses in scope
    const staffByBusiness = new Map<string, Array<{ id: string; location_id: string | null }>>();
    const providerIds: string[] = [];
    if (businessIds.length > 0) {
      const staffChunks = chunk(businessIds, 500);
      for (const ids of staffChunks) {
        const { data: staffRows, error: staffError } = await supabase
          .from("providers")
          .select("id, business_id, location_id, provider_role")
          .in("business_id", ids)
          .in("provider_role", ["owner", "provider"]);

        if (staffError) throw staffError;

        for (const row of staffRows || []) {
          if (!row?.business_id || !row?.id) continue;
          const list = staffByBusiness.get(row.business_id) || [];
          list.push({ id: row.id, location_id: row.location_id || null });
          staffByBusiness.set(row.business_id, list);
          providerIds.push(row.id);
        }
      }
    }

    // Load active provider_services counts for the staff set
    const activeServicesByProvider = new Map<string, number>();
    const uniqueProviderIds = Array.from(new Set(providerIds));
    if (uniqueProviderIds.length > 0) {
      const providerChunks = chunk(uniqueProviderIds, 500);
      for (const ids of providerChunks) {
        const { data: psRows, error: psError } = await supabase
          .from("provider_services")
          .select("provider_id")
          .in("provider_id", ids)
          .eq("is_active", true);

        if (psError) throw psError;

        for (const row of psRows || []) {
          const pid = row?.provider_id;
          if (!pid) continue;
          activeServicesByProvider.set(pid, (activeServicesByProvider.get(pid) || 0) + 1);
        }
      }
    }

    // Load active business services counts
    const activeBusinessServicesByBusiness = new Map<string, number>();
    if (businessIds.length > 0) {
      const bsChunks = chunk(businessIds, 500);
      for (const ids of bsChunks) {
        const { data: bsRows, error: bsError } = await supabase
          .from("business_services")
          .select("business_id")
          .in("business_id", ids)
          .eq("is_active", true);

        if (bsError) throw bsError;

        for (const row of bsRows || []) {
          const bid = row?.business_id;
          if (!bid) continue;
          activeBusinessServicesByBusiness.set(
            bid,
            (activeBusinessServicesByBusiness.get(bid) || 0) + 1,
          );
        }
      }
    }

    // Load Stripe connect status per business
    const stripeByBusiness = new Map<
      string,
      {
        account_id: string | null;
        charges_enabled: boolean | null;
        payouts_enabled: boolean | null;
        requirements_due: number;
      }
    >();

    if (businessIds.length > 0) {
      const stripeChunks = chunk(businessIds, 500);
      for (const ids of stripeChunks) {
        const { data: stripeRows, error: stripeError } = await supabase
          .from("stripe_connect_accounts")
          .select("business_id, account_id, charges_enabled, payouts_enabled, requirements")
          .in("business_id", ids);

        if (stripeError) throw stripeError;

        for (const row of stripeRows || []) {
          if (!row?.business_id) continue;
          const currentlyDue = (row.requirements as any)?.currently_due;
          const requirementsDue = Array.isArray(currentlyDue) ? currentlyDue.length : 0;
          stripeByBusiness.set(row.business_id, {
            account_id: row.account_id || null,
            charges_enabled: row.charges_enabled ?? null,
            payouts_enabled: row.payouts_enabled ?? null,
            requirements_due: requirementsDue,
          });
        }
      }
    }

    const formatToTitleCase = (str: string | null): string => {
      if (!str) return "Unknown";
      return str
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    const reports =
      (businesses || []).map((b: any) => {
        const staff = staffByBusiness.get(b.id) || [];
        const totalStaff = staff.length;
        const staffMissingLocation = staff.filter((p) => !p.location_id).length;
        const staffMissingServices = staff.filter(
          (p) => (activeServicesByProvider.get(p.id) || 0) === 0,
        ).length;

        const activeServicesCount = activeBusinessServicesByBusiness.get(b.id) || 0;

        const stripe = stripeByBusiness.get(b.id);
        const stripeStatus = !stripe?.account_id
          ? "not_connected"
          : stripe.charges_enabled && stripe.payouts_enabled && (stripe.requirements_due || 0) === 0
            ? "ready"
            : "action_needed";

        const issues: Array<{ code: string; label: string }> = [];

        if (stripeStatus !== "ready") {
          issues.push({
            code: "stripe",
            label:
              stripeStatus === "not_connected"
                ? "Stripe not connected"
                : `Stripe setup incomplete${(stripe?.requirements_due || 0) > 0 ? ` (${stripe?.requirements_due} due)` : ""}`,
          });
        }

        if (activeServicesCount === 0) {
          issues.push({ code: "services", label: "No active business services" });
        }

        if (totalStaff === 0) {
          issues.push({ code: "staff", label: "No staff providers (owner/provider) found" });
        } else {
          if (staffMissingServices > 0) {
            issues.push({
              code: "staff_services",
              label: `${staffMissingServices} staff missing assigned services`,
            });
          }
          if (staffMissingLocation > 0) {
            issues.push({
              code: "staff_location",
              label: `${staffMissingLocation} staff missing location`,
            });
          }
        }

        return {
          id: b.id,
          business_name: b.business_name,
          business_type: formatToTitleCase(b.business_type),
          verification_status: formatToTitleCase(b.verification_status),
          is_active: b.is_active ?? true,
          contact_email: b.contact_email || null,
          phone: b.phone || null,
          created_at: b.created_at,
          active_services: activeServicesCount,
          total_staff: totalStaff,
          staff_missing_services: staffMissingServices,
          staff_missing_location: staffMissingLocation,
          stripe_status: stripeStatus,
          stripe_requirements_due: stripe?.requirements_due || 0,
          issues,
          issue_count: issues.length,
        };
      }) || [];

    const withIssues = reports
      .filter((r) => (r.issue_count || 0) > 0)
      .sort((a, c) => (c.issue_count || 0) - (a.issue_count || 0));

    return res.json({ success: true, data: withIssues });
  } catch (error) {
    console.error("Error fetching business bookability reports:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch business bookability reports",
    });
  }
}
