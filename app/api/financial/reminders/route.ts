import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/financial/reminders
 * Fetch all payment plan reminders for the current RTO
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_plan_reminders')
      .select(
        `
        *,
        payment_plan_templates:template_id (
          id,
          name
        ),
        mail_templates:mail_template_id (
          id,
          name,
          subject
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/financial/reminders
 * Create a new payment plan reminder
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const {
      template_id,
      name,
      offset_days,
      mail_template_id,
      regenerate_invoice,
    } = body;

    // Validation
    if (
      !template_id ||
      !name ||
      offset_days === undefined ||
      !mail_template_id
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current user's RTO
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rtoId = (
      userData.user?.app_metadata as Record<string, unknown> | undefined
    )?.rto_id as string | undefined;
    if (!rtoId) {
      return NextResponse.json(
        { error: 'User RTO not found' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payment_plan_reminders')
      .insert({
        template_id,
        rto_id: rtoId,
        name,
        offset_days,
        mail_template_id,
        regenerate_invoice: regenerate_invoice ?? false,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
