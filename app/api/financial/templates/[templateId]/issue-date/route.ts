import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/financial/templates/[templateId]/issue-date
 *
 * Updates the issue_date_offset_days for a payment plan template
 * and recalculates issue dates for all affected SCHEDULED invoices
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const supabase = await createClient();
    const body = await req.json();

    const { offsetDays } = body;

    // Validate input
    if (offsetDays === undefined || typeof offsetDays !== 'number') {
      return NextResponse.json(
        { error: 'offsetDays must be a number' },
        { status: 400 }
      );
    }

    // Validate integer and reasonable range
    if (!Number.isInteger(offsetDays)) {
      return NextResponse.json(
        { error: 'offsetDays must be an integer' },
        { status: 400 }
      );
    }

    if (offsetDays < -365 || offsetDays > 365) {
      return NextResponse.json(
        { error: 'offsetDays must be between -365 and 365' },
        { status: 400 }
      );
    }

    // Use RPC function for atomic transaction
    const { data, error } = await supabase.rpc(
      'update_template_issue_date_offset',
      {
        p_template_id: templateId,
        p_offset_days: offsetDays,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (
      !data ||
      typeof data !== 'object' ||
      !('success' in data) ||
      !data.success
    ) {
      const errorMessage =
        typeof data === 'object' &&
        data &&
        'error' in data &&
        typeof data.error === 'string'
          ? data.error
          : 'Failed to update template issue date offset';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const invoicesUpdated =
      typeof data === 'object' &&
      data &&
      'invoicesUpdated' in data &&
      typeof data.invoicesUpdated === 'number'
        ? data.invoicesUpdated
        : 0;

    return NextResponse.json({
      success: true,
      invoicesUpdated,
      message:
        invoicesUpdated > 0
          ? `Template updated and ${invoicesUpdated} invoice(s) recalculated.`
          : 'Template updated. No future invoices to recalculate.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
