/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';
import { renderToBuffer } from 'https://esm.sh/@react-pdf/renderer@3.4.3?target=deno&external=react';
import { OfferLetterTemplate, type OfferLetterData } from './template.tsx';
import { buildOfferLetterData } from './transform.ts';
import { createElement } from 'https://esm.sh/react@18.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function toSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUserClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const service = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Fetch application with joins required to build data
    const { data: application, error: appErr } = await supabaseUserClient
      .from('applications')
      .select(
        `*,
         programs:program_id(id, code, name, nominal_hours),
         agents:agent_id(id, name),
         timetables:timetable_id(id, rto_id, program_id),
         rtos:rto_id(id, name, rto_code, address_line_1, suburb, state, postcode, phone_number, email_address)`
      )
      .eq('id', applicationId)
      .single();

    if (appErr || !application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Tenant check: user must belong to same RTO
    const userRtoId = (supabaseUserClient.auth.getUser &&
      (await supabaseUserClient.auth.getUser()).data.user?.app_metadata
        ?.rto_id) as string | undefined;
    if (userRtoId && application.rto_id !== userRtoId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Payment schedule rows
    const { data: schedule, error: schedErr } = await supabaseUserClient
      .from('application_payment_schedule')
      .select('*')
      .eq('application_id', applicationId)
      .order('sequence_order', { ascending: true });

    if (schedErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to load payment schedule' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Build template data
    const data: OfferLetterData = buildOfferLetterData({
      application,
      schedule: schedule ?? [],
    });

    // Render PDF buffer without JSX
    const element = createElement(OfferLetterTemplate, { data });
    const pdfBuffer = await renderToBuffer(element);
    const bytes = new Uint8Array(pdfBuffer);
    const sha256 = await toSha256Hex(bytes);
    const size = bytes.byteLength;

    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const fileName = `offer-${stamp}.pdf`;
    const filePath = `${applicationId}/offer_letters/${fileName}`;

    // Upload to Storage using service role (bypass RLS for write)
    const { error: uploadErr } = await service.storage
      .from('applications')
      .upload(filePath, bytes, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Insert metadata row
    const { error: insertErr } = await service.from('offer_letters').insert({
      rto_id: application.rto_id,
      application_id: applicationId,
      file_path: filePath,
      version: 'v1',
      template_key: 'default',
      generated_by: (await supabaseUserClient.auth.getUser()).data.user
        ?.id as unknown as string,
      sha256,
      size_bytes: size,
    });
    if (insertErr) {
      return new Response(
        JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create signed URL for immediate download
    const { data: signed, error: signErr } = await service.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 5);
    if (signErr) {
      return new Response(
        JSON.stringify({ error: `Sign URL failed: ${signErr.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        filePath,
        signedUrl: signed?.signedUrl,
        generatedAt: new Date().toISOString(),
        sha256,
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
