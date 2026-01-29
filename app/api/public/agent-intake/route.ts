import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { TablesInsert } from '@/database.types';

// Omit application_id_display from Insert type since trigger generates it
type ApplicationInsert = Omit<
  TablesInsert<'applications'>,
  'application_id_display'
>;

// Minimal schema: mirror draft application fields we allow via public form
const payloadSchema = z.object({
  agent_slug: z.string().min(1),
  // Personal
  salutation: z.string().optional(),
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  preferred_name: z.string().optional(),
  date_of_birth: z.union([z.string(), z.date()]).optional(),
  // Contacts and addresses
  email: z.string().email().optional().or(z.literal('')),
  work_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  alternative_email: z.string().email().optional().or(z.literal('')),
  address_line_1: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  street_building_name: z.string().optional(),
  street_unit_details: z.string().optional(),
  street_number: z.string().optional(),
  street_name: z.string().optional(),
  street_po_box: z.string().optional(),
  street_country: z.string().optional(),
  postal_is_same_as_street: z.boolean().optional(),
  postal_building_name: z.string().optional(),
  postal_unit_details: z.string().optional(),
  postal_street_number: z.string().optional(),
  postal_street_name: z.string().optional(),
  postal_po_box: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),
  // AVETMISS
  gender: z.string().optional(),
  highest_school_level_id: z.string().optional(),
  indigenous_status_id: z.string().optional(),
  labour_force_status_id: z.string().optional(),
  country_of_birth_id: z.string().optional(),
  language_code: z.string().optional(),
  citizenship_status_code: z.string().optional(),
  at_school_flag: z.string().optional(),
  year_highest_school_level_completed: z.string().optional(),
  survey_contact_status: z.string().optional(),
  vsn: z.string().optional(),
  // CRICOS
  is_international: z.boolean().optional(),
  usi: z.string().optional(),
  passport_number: z.string().optional(),
  visa_type: z.string().optional(),
  visa_number: z.string().optional(),
  country_of_citizenship: z.string().optional(),
  ielts_score: z.string().optional(),
  // Embedded Emergency Contact
  ec_name: z.string().optional(),
  ec_relationship: z.string().optional(),
  ec_phone_number: z.string().optional(),
  // Embedded Parent/Guardian
  g_name: z.string().optional(),
  g_email: z.string().email().optional().or(z.literal('')),
  g_phone_number: z.string().optional(),
  // Requested Start Date
  requested_start_date: z.union([z.string(), z.date()]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const supabase = createAdminClient();

    // Resolve agent by slug within tenant; rto is on agents table
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, rto_id')
      .eq('slug', input.agent_slug)
      .single();
    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const toDateString = (v: unknown) =>
      !v ? null : typeof v === 'string' ? v : (v as Date).toISOString();

    // Get default location for this RTO (required field)
    const { data: locations, error: locError } = await supabase
      .from('delivery_locations')
      .select('id')
      .eq('rto_id', agent.rto_id)
      .order('name', { ascending: true })
      .limit(1);

    if (locError || !locations || locations.length === 0) {
      return NextResponse.json(
        { error: 'No locations available for this RTO' },
        { status: 400 }
      );
    }

    const defaultLocationId = locations[0].id;

    // Prepare insert payload
    // Exclude application_id_display - trigger will generate it automatically
    const insertData: ApplicationInsert = {
      rto_id: agent.rto_id,
      status: 'DRAFT' as const,
      agent_id: agent.id,
      preferred_location_id: defaultLocationId,
      salutation: input.salutation ?? null,
      first_name: input.first_name ?? null,
      middle_name: input.middle_name ?? null,
      last_name: input.last_name ?? null,
      preferred_name: input.preferred_name ?? null,
      date_of_birth: input.date_of_birth
        ? toDateString(input.date_of_birth)
        : null,
      email: input.email || null,
      work_phone: input.work_phone ?? null,
      mobile_phone: input.mobile_phone ?? null,
      alternative_email: input.alternative_email || null,
      address_line_1: input.address_line_1 ?? null,
      suburb: input.suburb ?? null,
      state: input.state ?? null,
      postcode: input.postcode ?? null,
      street_building_name: input.street_building_name ?? null,
      street_unit_details: input.street_unit_details ?? null,
      street_number: input.street_number ?? null,
      street_name: input.street_name ?? null,
      street_po_box: input.street_po_box ?? null,
      street_country: input.street_country ?? null,
      postal_is_same_as_street: input.postal_is_same_as_street ?? null,
      postal_building_name: input.postal_building_name ?? null,
      postal_unit_details: input.postal_unit_details ?? null,
      postal_street_number: input.postal_street_number ?? null,
      postal_street_name: input.postal_street_name ?? null,
      postal_po_box: input.postal_po_box ?? null,
      postal_suburb: input.postal_suburb ?? null,
      postal_state: input.postal_state ?? null,
      postal_postcode: input.postal_postcode ?? null,
      postal_country: input.postal_country ?? null,
      gender: input.gender ?? null,
      highest_school_level_id: input.highest_school_level_id ?? null,
      indigenous_status_id: input.indigenous_status_id ?? null,
      labour_force_status_id: input.labour_force_status_id ?? null,
      country_of_birth_id: input.country_of_birth_id ?? null,
      language_code: input.language_code ?? null,
      citizenship_status_code: input.citizenship_status_code ?? null,
      at_school_flag: input.at_school_flag ?? null,
      year_highest_school_level_completed:
        input.year_highest_school_level_completed ?? null,
      survey_contact_status: input.survey_contact_status ?? 'A',
      vsn: input.vsn ?? null,
      is_international: input.is_international ?? null,
      usi: input.usi ?? null,
      passport_number: input.passport_number ?? null,
      visa_type: input.visa_type ?? null,
      visa_number: input.visa_number ?? null,
      country_of_citizenship: input.country_of_citizenship ?? null,
      ielts_score: input.ielts_score ?? null,
      ec_name: input.ec_name ?? null,
      ec_relationship: input.ec_relationship ?? null,
      ec_phone_number: input.ec_phone_number ?? null,
      g_name: input.g_name ?? null,
      g_email: input.g_email || null,
      g_phone_number: input.g_phone_number ?? null,
      requested_start_date: input.requested_start_date
        ? toDateString(input.requested_start_date)
        : null,
    };

    const { data: app, error } = await supabase
      .from('applications')
      .insert(insertData as unknown as TablesInsert<'applications'>) // Type assertion needed because Insert type requires application_id_display, but trigger generates it
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ id: app.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
