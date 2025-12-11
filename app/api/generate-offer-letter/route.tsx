import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { OfferLetterTemplate } from '@/lib/pdf/OfferLetterTemplate';
import { DomesticOfferLetterTemplate } from '@/lib/pdf/DomesticOfferLetterTemplate';
import { buildOfferLetterData } from '@/lib/pdf/buildOfferLetterData';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId is required' }),
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_ROLE_KEY!
    );

    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select(
        `*,
         programs:program_id(id, code, name, nominal_hours, level_of_education_id),
         agents:agent_id(id, name),
         timetables:timetable_id(id, rto_id, program_id),
         rtos:rto_id(id, name, rto_code, cricos_code, address_line_1, suburb, state, postcode, phone_number, email_address, profile_image_path, bank_name, bank_account_name, bank_bsb, bank_account_number),
         application_learning_subjects(planned_end_date)`
      )
      .eq('id', applicationId)
      .single();
    if (appErr || !application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
      });
    }

    const { data: schedule, error: schedErr } = await supabase
      .from('application_payment_schedule')
      .select('*')
      .eq('application_id', applicationId)
      .order('sequence_order', { ascending: true });
    if (schedErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to load payment schedule' }),
        { status: 400 }
      );
    }

    let rtoLogoUrl: string | null = null;
    const logoPath = application.rtos?.profile_image_path;
    if (logoPath) {
      const { data: signedLogo, error: logoErr } = await admin.storage
        .from('rto-assets')
        .createSignedUrl(logoPath, 3600);
      if (!logoErr && signedLogo?.signedUrl) {
        rtoLogoUrl = signedLogo.signedUrl;
      }
    }

    const data = buildOfferLetterData({
      application,
      schedule: schedule ?? [],
      rtoLogoUrl,
    });

    // Select template based on international status
    const Template = application.is_international
      ? OfferLetterTemplate
      : DomesticOfferLetterTemplate;

    const pdfBuffer = await renderToBuffer(<Template data={data} />);

    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const filePath = `${applicationId}/offer_letters/offer-${stamp}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from('applications')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
        { status: 500 }
      );
    }

    const { error: insertErr } = await admin.from('offer_letters').insert({
      rto_id: application.rto_id,
      application_id: applicationId,
      file_path: filePath,
      version: 'v1',
      template_key: 'default',
      generated_by: null,
      size_bytes: pdfBuffer.byteLength,
    });
    if (insertErr) {
      return new Response(
        JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }),
        { status: 500 }
      );
    }

    // Update application status to OFFER_GENERATED
    const { error: statusErr } = await admin
      .from('applications')
      .update({ status: 'OFFER_GENERATED' })
      .eq('id', applicationId);
    if (statusErr) {
      return new Response(
        JSON.stringify({ error: `Status update failed: ${statusErr.message}` }),
        { status: 500 }
      );
    }

    const { data: signed, error: signErr } = await admin.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 5);
    if (signErr) {
      return new Response(
        JSON.stringify({ error: `Sign URL failed: ${signErr.message}` }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ filePath, signedUrl: signed?.signedUrl }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
