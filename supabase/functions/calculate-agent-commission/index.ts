/// <reference lib="deno.ns" />

//
// XPortal - Calculate Agent Commission Edge Function
//
// This function calculates and creates commission invoices when a student payment
// is recorded. It checks if the payment is commissionable and if the student
// has an active agent, then generates a commission invoice with GST.
//

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

interface CommissionCalculationRequest {
  paymentId: string;
}

interface CommissionCalculationResponse {
  created: boolean;
  commissionInvoiceId?: string;
  reason?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role client to bypass RLS for commission calculation
    const supabase = createClient<Db>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId }: CommissionCalculationRequest = await req.json();

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'paymentId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch payment details
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select('id, invoice_id, rto_id, amount_cents, payment_date')
      .eq('id', paymentId)
      .single();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({
          error: 'Payment not found',
          details: paymentErr?.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Skip if payment amount is zero or negative
    if (payment.amount_cents <= 0) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Payment amount is zero or negative',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 2. Check if commission invoice already exists (idempotency)
    const { data: existingCommission } = await supabase
      .from('commission_invoices')
      .select('id')
      .eq('student_payment_id', paymentId)
      .single();

    if (existingCommission) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Commission invoice already exists for this payment',
          commissionInvoiceId: existingCommission.id,
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Fetch invoice and enrollment details
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('id, enrollment_id, amount_due_cents, due_date')
      .eq('id', payment.invoice_id)
      .single();

    if (invoiceErr || !invoice) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Invoice not found',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 4. Fetch enrollment and student details
    const { data: enrollment, error: enrollmentErr } = await supabase
      .from('enrollments')
      .select('id, student_id, payment_plan_template_id')
      .eq('id', invoice.enrollment_id)
      .single();

    if (enrollmentErr || !enrollment) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Enrollment not found',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 5. Fetch student and application details
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, application_id')
      .eq('id', enrollment.student_id)
      .single();

    if (studentErr || !student || !student.application_id) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Student or application not found',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 6. Fetch application to get agent_id
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select('id, agent_id')
      .eq('id', student.application_id)
      .single();

    if (appErr || !application || !application.agent_id) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Application not found or no agent assigned',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 7. Fetch agent details
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select(
        'id, commission_rate_percent, commission_active, commission_start_date, commission_end_date'
      )
      .eq('id', application.agent_id)
      .single();

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Agent not found',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 8. Check if agent commissions are active
    if (!agent.commission_active) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Agent commissions are not active',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 9. Check commission validity period
    const today = new Date().toISOString().split('T')[0];
    if (agent.commission_start_date && agent.commission_start_date > today) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Commission start date has not been reached',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    if (agent.commission_end_date && agent.commission_end_date < today) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Commission end date has passed',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 10. Check if commission rate is set
    if (!agent.commission_rate_percent || agent.commission_rate_percent <= 0) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Agent commission rate is not set or is zero',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 11. Determine commissionable basis: prefer invoice_lines, fallback to schedule flag
    const { data: invoiceLines, error: linesErr } = await supabase
      .from('invoice_lines')
      .select('amount_cents, is_commissionable')
      .eq('invoice_id', invoice.id);

    let commissionableAmountCents: number | null = null;
    let totalLineAmountCents: number | null = null;

    if (linesErr) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Failed to read invoice lines',
          details: linesErr.message,
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (invoiceLines && invoiceLines.length > 0) {
      const commissionableLines = invoiceLines.filter((l) =>
        Boolean(l.is_commissionable)
      );
      commissionableAmountCents = commissionableLines.reduce(
        (sum, line) => sum + Math.max(0, line.amount_cents ?? 0),
        0
      );
      totalLineAmountCents = invoiceLines.reduce(
        (sum, line) => sum + Math.max(0, line.amount_cents ?? 0),
        0
      );

      if (!commissionableLines.length || commissionableAmountCents <= 0) {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'No commissionable invoice lines for this invoice',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (!totalLineAmountCents || totalLineAmountCents <= 0) {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'Invoice lines total is zero; cannot prorate commission',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    } else {
      // Fallback to installment flag if lines are not present
      const { data: paymentSchedule, error: scheduleErr } = await supabase
        .from('application_payment_schedule')
        .select('template_installment_id, due_date, amount_cents')
        .eq('application_id', application.id)
        .eq('due_date', invoice.due_date)
        .limit(1)
        .maybeSingle();

      if (scheduleErr || !paymentSchedule) {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'Payment schedule entry not found for this invoice',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      const { data: templateInstallment, error: installmentErr } =
        await supabase
          .from('payment_plan_template_installments')
          .select('id, is_commissionable')
          .eq('id', paymentSchedule.template_installment_id)
          .single();

      if (installmentErr || !templateInstallment) {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'Template installment not found',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (!templateInstallment.is_commissionable) {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'Installment is not commissionable',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      commissionableAmountCents = payment.amount_cents;
    }

    // 12. Calculate commission amounts using commissionable portion (cap by payment)
    const commissionRate = Number(agent.commission_rate_percent) / 100;

    let basis: number;
    if (invoiceLines && invoiceLines.length > 0 && totalLineAmountCents) {
      // Prorate payment to commissionable portion of the invoice.
      const commissionableShare =
        (commissionableAmountCents ?? 0) / totalLineAmountCents;
      basis = Math.round(payment.amount_cents * commissionableShare);
    } else {
      // Fallback: whole payment amount (installment-based)
      basis = Math.min(payment.amount_cents, commissionableAmountCents ?? 0);
    }

    const baseAmountCents = Math.round(basis * commissionRate);

    // Skip if base commission is zero
    if (baseAmountCents <= 0) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Calculated commission amount is zero',
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // GST is 10% of base amount (rounded down to nearest cent)
    const gstAmountCents = Math.floor(baseAmountCents * 0.1);
    const totalAmountCents = baseAmountCents + gstAmountCents;

    // 14. Generate commission invoice number
    const { data: invoiceNumber, error: invoiceNumErr } = await supabase.rpc(
      'generate_commission_invoice_number',
      {
        p_rto_id: payment.rto_id,
      }
    );

    if (invoiceNumErr || !invoiceNumber) {
      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Failed to generate commission invoice number',
          details: invoiceNumErr?.message,
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 15. Calculate due date (30 days from payment date)
    const paymentDate = new Date(payment.payment_date);
    const dueDate = new Date(paymentDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // 16. Insert commission invoice
    const { data: commissionInvoice, error: insertErr } = await supabase
      .from('commission_invoices')
      .insert({
        rto_id: payment.rto_id,
        agent_id: agent.id,
        student_id: student.id,
        enrollment_id: enrollment.id,
        student_payment_id: payment.id,
        base_amount_cents: baseAmountCents,
        gst_amount_cents: gstAmountCents,
        total_amount_cents: totalAmountCents,
        commission_rate_applied: agent.commission_rate_percent,
        invoice_number: invoiceNumber,
        issue_date: payment.payment_date,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'UNPAID',
      })
      .select('id')
      .single();

    if (insertErr || !commissionInvoice) {
      // Check if it's a unique constraint violation (idempotency)
      if (insertErr?.code === '23505') {
        return new Response(
          JSON.stringify({
            created: false,
            reason: 'Commission invoice already exists (idempotency check)',
          } as CommissionCalculationResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      return new Response(
        JSON.stringify({
          created: false,
          reason: 'Failed to create commission invoice',
          details: insertErr?.message,
        } as CommissionCalculationResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 17. Return success
    return new Response(
      JSON.stringify({
        created: true,
        commissionInvoiceId: commissionInvoice.id,
      } as CommissionCalculationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in calculate-agent-commission:', error);
    return new Response(
      JSON.stringify({
        created: false,
        reason: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      } as CommissionCalculationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
