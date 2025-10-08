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

    // Determine anchor date according to template.anchor_type
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
      .select('id, anchor_type')
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

    let anchorDate: string | null = null;
    if (template.anchor_type === 'COMMENCEMENT_DATE') {
      anchorDate = app.proposed_commencement_date as string | null;
    } else if (template.anchor_type === 'OFFER_DATE') {
      anchorDate = app.offer_generated_at
        ? new Date(app.offer_generated_at as string).toISOString().slice(0, 10)
        : null;
    } else if (template.anchor_type === 'CUSTOM_DATE') {
      anchorDate = app.payment_anchor_date as string | null;
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
        student_id_display: crypto.randomUUID(),
        rto_id: app.rto_id,
        application_id: app.id,
        first_name: app.first_name!,
        last_name: app.last_name!,
        email: app.email!,
        date_of_birth: app.date_of_birth!,
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
        qualification_id: app.program_id ?? app.qualification_id, // compatibility with rename
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

    // 3) Fetch installments for template
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
    const invoiceRows = (installments ?? []).map((i, idx) => {
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
