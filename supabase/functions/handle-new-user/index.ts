import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    email: string;
    raw_app_meta_data: {
      rto_id: string;
      role: string;
    };
    raw_user_meta_data: {
      first_name?: string;
      last_name?: string;
    };
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle new user creations
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return new Response(JSON.stringify({ message: 'Not a new user event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Extract user data
    const {
      id: userId,
      raw_app_meta_data: { rto_id, role },
      raw_user_meta_data: { first_name = '', last_name = '' },
    } = payload.record;

    // Call the handle_new_user function
    const { error } = await supabaseAdmin.rpc('handle_new_user', {
      user_id: userId,
      rto_id,
      role,
      first_name,
      last_name,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: 'Profile created successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error handling new user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
