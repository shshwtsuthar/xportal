/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient<Db>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch application with needed fields
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (app.status !== 'ACCEPTED') {
      return new Response(
        JSON.stringify({
          error: `Application must be ACCEPTED to approve. Current: ${app.status}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      );
    }

    // Determine anchor date with precedence: user-selected first, then template rule
    if (!app.payment_plan_template_id) {
      return new Response(
        JSON.stringify({
          error: 'payment_plan_template_id not set on application',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { data: template, error: tplErr } = await supabase
      .from('payment_plan_templates')
      .select('id')
      .eq('id', app.payment_plan_template_id)
      .single();
    if (tplErr || !template) {
      return new Response(
        JSON.stringify({ error: 'Payment plan template not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Anchor precedence: user-selected > commencement > offer
    let anchorDate: string | null = null;
    if (app.payment_anchor_date) {
      anchorDate = app.payment_anchor_date as string;
    } else if (app.proposed_commencement_date) {
      anchorDate = app.proposed_commencement_date as string;
    } else if (app.offer_generated_at) {
      anchorDate = new Date(app.offer_generated_at as string)
        .toISOString()
        .slice(0, 10);
    }

    if (!anchorDate) {
      return new Response(
        JSON.stringify({
          error: 'Anchor date cannot be determined for template',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Begin approval transaction using PostgREST sequential operations
    // 1) Create student
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .insert({
        rto_id: app.rto_id,
        application_id: app.id,
        first_name: app.first_name!,
        last_name: app.last_name!,
        email: app.email!,
        date_of_birth: app.date_of_birth!,
        status: 'ACTIVE',
      })
      .select('*')
      .single();
    if (studentErr || !student) {
      return new Response(
        JSON.stringify({ error: 'Failed to create student' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 2) Create enrollment and copy template id
    const { data: enrollment, error: enrErr } = await supabase
      .from('enrollments')
      .insert({
        student_id: student.id,
        program_id: app.program_id, // align with current schema
        rto_id: app.rto_id,
        status: 'ACTIVE',
        commencement_date: anchorDate,
        payment_plan_template_id: app.payment_plan_template_id,
      })
      .select('*')
      .single();
    if (enrErr || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'Failed to create enrollment' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 3) Use application_payment_schedule snapshot if present; fallback to on-the-fly calc
    const { data: snapshot, error: snapErr } = await supabase
      .from('application_payment_schedule')
      .select('name, amount_cents, due_date')
      .eq('application_id', app.id)
      .order('sequence_order', { ascending: true })
      .order('due_date', { ascending: true })
      .order('name', { ascending: true });

    let invoiceRows: Db['public']['Tables']['invoices']['Insert'][] = [];
    if (!snapErr && snapshot && snapshot.length > 0) {
      invoiceRows = snapshot.map((row, idx) => {
        const isFirst = idx === 0;
        return {
          enrollment_id: enrollment.id,
          rto_id: app.rto_id,
          status: isFirst ? 'SENT' : 'SCHEDULED',
          invoice_number: crypto.randomUUID(),
          issue_date: isFirst
            ? new Date().toISOString().slice(0, 10)
            : (row.due_date as string),
          due_date: row.due_date as string,
          amount_due_cents: row.amount_cents as number,
          amount_paid_cents: 0,
        } as Db['public']['Tables']['invoices']['Insert'];
      });
    } else {
      // Fallback: compute based on template installments and anchor
      const { data: installments, error: instErr } = await supabase
        .from('payment_plan_template_installments')
        .select('id, name, amount_cents, due_date_rule_days')
        .eq('template_id', template.id)
        .order('due_date_rule_days', { ascending: true });
      if (instErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to read installments' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      const anchor = new Date(anchorDate);
      invoiceRows = (installments ?? []).map((i, idx) => {
        const due = new Date(anchor);
        due.setDate(due.getDate() + Number(i.due_date_rule_days));
        const dueDateStr = due.toISOString().slice(0, 10);
        const isFirst = idx === 0;
        return {
          enrollment_id: enrollment.id,
          rto_id: app.rto_id,
          status: isFirst ? 'SENT' : 'SCHEDULED',
          invoice_number: crypto.randomUUID(),
          issue_date: isFirst
            ? new Date().toISOString().slice(0, 10)
            : dueDateStr,
          due_date: dueDateStr,
          amount_due_cents: i.amount_cents,
          amount_paid_cents: 0,
        } as Db['public']['Tables']['invoices']['Insert'];
      });
    }

    if (invoiceRows.length > 0) {
      const { error: invErr } = await supabase
        .from('invoices')
        .insert(invoiceRows);
      if (invErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to create invoices' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // --- Extended copy: student domain normalization ---
    // 3b) Addresses (street + postal)
    {
      const street = {
        student_id: student.id,
        rto_id: app.rto_id,
        type: 'street',
        building_name: app.street_building_name,
        unit_details: app.street_unit_details,
        number_name: app.street_number_name,
        po_box: app.street_po_box,
        suburb: app.suburb,
        state: app.state,
        postcode: app.postcode,
        country: app.street_country,
        is_primary: true,
      } as const;
      const postal = app.postal_is_same_as_street
        ? null
        : {
            student_id: student.id,
            rto_id: app.rto_id,
            type: 'postal',
            building_name: app.postal_building_name,
            unit_details: app.postal_unit_details,
            number_name: app.postal_number_name,
            po_box: app.postal_po_box,
            suburb: app.postal_suburb,
            state: app.postal_state,
            postcode: app.postal_postcode,
            country: app.postal_country,
            is_primary: false,
          };
      const addrRows = [street, postal].filter(
        Boolean
      ) as Db['public']['Tables']['student_addresses']['Insert'][];
      if (addrRows.length > 0) {
        const { error: addrErr } = await supabase
          .from('student_addresses')
          .insert(addrRows);
        if (addrErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to copy student addresses' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // 3c) AVETMISS snapshot
    {
      const { error: avErr } = await supabase.from('student_avetmiss').insert({
        student_id: student.id,
        rto_id: app.rto_id,
        gender: app.gender,
        highest_school_level_id: app.highest_school_level_id,
        indigenous_status_id: app.indigenous_status_id,
        labour_force_status_id: app.labour_force_status_id,
        country_of_birth_id: app.country_of_birth_id,
        language_code: app.language_code,
        citizenship_status_code: app.citizenship_status_code,
        at_school_flag: app.at_school_flag,
      });
      if (avErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to copy AVETMISS details' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // 3d) CRICOS snapshot
    {
      const { error: crErr } = await supabase.from('student_cricos').insert({
        student_id: student.id,
        rto_id: app.rto_id,
        is_international: Boolean(app.is_international),
        passport_number: app.passport_number,
        visa_type: app.visa_type,
        visa_number: app.visa_number,
        country_of_citizenship: app.country_of_citizenship,
        ielts_score: app.ielts_score,
      });
      if (crErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to copy CRICOS details' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // 3e) Emergency and guardian contacts
    {
      const inserts: Db['public']['Tables']['student_contacts_emergency']['Insert'][] =
        [];
      if (app.ec_name || app.ec_phone_number || app.ec_relationship) {
        inserts.push({
          student_id: student.id,
          rto_id: app.rto_id,
          name: app.ec_name,
          relationship: app.ec_relationship,
          phone_number: app.ec_phone_number,
        });
      }
      if (inserts.length > 0) {
        const { error: ecErr } = await supabase
          .from('student_contacts_emergency')
          .insert(inserts);
        if (ecErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to copy emergency contacts' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
      if (app.g_name || app.g_email || app.g_phone_number) {
        const { error: gErr } = await supabase
          .from('student_contacts_guardians')
          .insert({
            student_id: student.id,
            rto_id: app.rto_id,
            name: app.g_name,
            email: app.g_email,
            phone_number: app.g_phone_number,
          });
        if (gErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to copy guardian contact' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // 3f) Learning plan subjects → enrollment_subjects
    {
      const { data: subjects, error: subjErr } = await supabase
        .from('application_learning_subjects')
        .select(
          'program_plan_subject_id, subject_id, planned_start_date, planned_end_date, is_catch_up, is_prerequisite'
        )
        .eq('application_id', app.id)
        .order('sequence_order', { ascending: true });
      if (!subjErr && subjects && subjects.length > 0) {
        const rows = subjects.map(
          (
            s: Db['public']['Tables']['application_learning_subjects']['Row']
          ) => ({
            enrollment_id: enrollment.id,
            program_plan_subject_id: s.program_plan_subject_id,
            outcome_code: null,
            start_date: s.planned_start_date,
            end_date: s.planned_end_date,
            is_catch_up: s.is_catch_up,
            delivery_location_id: null,
            delivery_mode_id: null,
            scheduled_hours: null,
          })
        );
        const { error: insErr } = await supabase
          .from('enrollment_subjects')
          .insert(rows);
        if (insErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to copy enrollment subjects' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // 3g) Learning plan classes → enrollment_classes
    {
      const { data: classes, error: clsErr } = await supabase
        .from('application_learning_classes')
        .select(
          'program_plan_class_id, class_date, start_time, end_time, trainer_id, location_id, classroom_id, class_type'
        )
        .eq('application_id', app.id);
      if (!clsErr && classes && classes.length > 0) {
        const rows = classes.map(
          (
            c: Db['public']['Tables']['application_learning_classes']['Row']
          ) => ({
            enrollment_id: enrollment.id,
            program_plan_class_id: c.program_plan_class_id,
            class_date: c.class_date,
            start_time: c.start_time,
            end_time: c.end_time,
            trainer_id: c.trainer_id,
            location_id: c.location_id,
            classroom_id: c.classroom_id,
            class_type: c.class_type,
            notes: null,
          })
        );
        const { error: insErr } = await supabase
          .from('enrollment_classes')
          .insert(rows);
        if (insErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to copy enrollment classes' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // 4) Update application status to APPROVED
    const { error: updErr } = await supabase
      .from('applications')
      .update({ status: 'APPROVED' })
      .eq('id', app.id);
    if (updErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to update application status' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Application approved, invoices generated',
        studentId: student.id,
        enrollmentId: enrollment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
