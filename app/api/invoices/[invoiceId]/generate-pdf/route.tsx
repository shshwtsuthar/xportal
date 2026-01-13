import { NextRequest } from 'next/server';
import { generateInvoicePdf } from '@/lib/pdf/generate-invoice-pdf';

export const runtime = 'nodejs';

/**
 * Generate and download invoice PDF on-demand.
 * This endpoint ONLY generates and returns the PDF for download.
 * No storage or database operations are performed here.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Invoice ID is required' }), {
        status: 400,
      });
    }

    // Generate PDF using unified function
    const pdfBytes = await generateInvoicePdf({
      invoiceId,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    });

    // Return PDF directly for download
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
      type: 'application/pdf',
    });
    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
