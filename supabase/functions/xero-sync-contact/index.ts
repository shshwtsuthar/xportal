/// <reference lib="deno.ns" />

//
// XPortal - Xero Contact Sync Edge Function
//
// Syncs a student to Xero as a Contact. This function is called after a student
// is created/approved to ensure they exist in Xero before invoices are created.
//

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';
import { XeroClient } from '../_shared/xero-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

interface SyncContactRequest {
  studentId: string;
}

interface SyncContactResponse {
  success: boolean;
  xeroContactId?: string;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role client to bypass RLS
    const supabase = createClient<Db>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { studentId }: SyncContactRequest = await req.json();

    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'studentId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 1. Fetch student with address and contact details
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select(
        'id, rto_id, first_name, last_name, email, mobile_phone, work_phone, xero_contact_id'
      )
      .eq('id', studentId)
      .single();

    if (studentErr || !student) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Student not found: ${studentErr?.message}`,
        } as SyncContactResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // 2. Check if already synced (idempotent)
    if (student.xero_contact_id) {
      return new Response(
        JSON.stringify({
          success: true,
          xeroContactId: student.xero_contact_id,
        } as SyncContactResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Fetch student addresses (primary street address)
    const { data: addresses } = await supabase
      .from('student_addresses')
      .select(
        'type, number_name, unit_details, building_name, suburb, state, postcode, country'
      )
      .eq('student_id', studentId)
      .eq('type', 'street')
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    // 4. Initialize Xero client
    const xeroClient = new XeroClient(student.rto_id);

    // 5. Build Xero Contact payload
    const contactPayload = {
      Contacts: [
        {
          Name: `${student.first_name} ${student.last_name}`.trim(),
          FirstName: student.first_name || '',
          LastName: student.last_name || '',
          EmailAddress: student.email || undefined,
          ContactNumber: studentId, // Use student ID as contact number
          ContactStatus: 'ACTIVE',
          Addresses: addresses
            ? [
                {
                  AddressType: 'STREET',
                  AddressLine1: [
                    addresses.unit_details,
                    addresses.number_name,
                    addresses.building_name,
                  ]
                    .filter(Boolean)
                    .join(' '),
                  City: addresses.suburb || undefined,
                  Region: addresses.state || undefined,
                  PostalCode: addresses.postcode || undefined,
                  Country: addresses.country || 'Australia',
                },
              ]
            : undefined,
          Phones: [
            student.mobile_phone
              ? {
                  PhoneType: 'MOBILE',
                  PhoneNumber: student.mobile_phone,
                }
              : undefined,
            student.work_phone
              ? {
                  PhoneType: 'DEFAULT',
                  PhoneNumber: student.work_phone,
                }
              : undefined,
          ].filter(Boolean),
        },
      ],
    };

    // 6. Create contact in Xero
    const response = await xeroClient.request('POST', '/Contacts', {
      body: contactPayload,
    });

    const responseText = await response.text();

    if (!response.ok) {
      const errorMessage = XeroClient.parseError(response, responseText);
      console.error('Xero API error:', errorMessage, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        } as SyncContactResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    // 7. Parse response and extract ContactID
    const responseData = JSON.parse(responseText) as {
      Contacts?: Array<{ ContactID?: string }>;
    };

    const contactId =
      responseData.Contacts && responseData.Contacts.length > 0
        ? responseData.Contacts[0].ContactID
        : null;

    if (!contactId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Xero returned contact but no ContactID',
        } as SyncContactResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 8. Store ContactID in database
    const { error: updateErr } = await supabase
      .from('students')
      .update({ xero_contact_id: contactId })
      .eq('id', studentId);

    if (updateErr) {
      console.error('Failed to update student with Xero ContactID:', updateErr);
      // Still return success since Xero contact was created
    }

    return new Response(
      JSON.stringify({
        success: true,
        xeroContactId: contactId,
      } as SyncContactResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in xero-sync-contact:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as SyncContactResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
