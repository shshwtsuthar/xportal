import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Ensure requester is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be admin
    const requesterRole = (
      user.app_metadata as Record<string, unknown> | undefined
    )?.role;
    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rtoId = (user.app_metadata as Record<string, unknown> | undefined)
      ?.rto_id as string | undefined;
    if (!rtoId) {
      return NextResponse.json(
        { error: 'Missing RTO context' },
        { status: 400 }
      );
    }

    // Use service role for admin operations
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get profiles for the current RTO
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('rto_id', rtoId)
      .order('first_name', { ascending: true });

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 400 }
      );
    }

    // Get auth users data to get email and created_at
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Combine the data
    const users = (profiles ?? []).map((profile) => {
      const authUser = authUsers?.users.find((u) => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email,
        created_at: authUser?.created_at,
      };
    });

    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
