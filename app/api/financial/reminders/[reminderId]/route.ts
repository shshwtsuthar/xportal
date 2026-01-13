import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/financial/reminders/[reminderId]
 * Fetch a single payment plan reminder
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const { reminderId } = await params;
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
      .eq('id', reminderId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/financial/reminders/[reminderId]
 * Update a payment plan reminder
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const { reminderId } = await params;
    const supabase = await createClient();
    const body = await req.json();

    const { name, offset_days, mail_template_id, regenerate_invoice } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (offset_days !== undefined) updateData.offset_days = offset_days;
    if (mail_template_id !== undefined)
      updateData.mail_template_id = mail_template_id;
    if (regenerate_invoice !== undefined)
      updateData.regenerate_invoice = regenerate_invoice;

    const { data, error } = await supabase
      .from('payment_plan_reminders')
      .update(updateData)
      .eq('id', reminderId)
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

/**
 * DELETE /api/financial/reminders/[reminderId]
 * Delete a payment plan reminder
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const { reminderId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('payment_plan_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
