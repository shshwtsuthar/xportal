import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/database.types';

export async function POST() {
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

    const userId = user.id;
    const role = (user.app_metadata as Record<string, unknown> | undefined)
      ?.role as Database['public']['Enums']['user_role'] | undefined;

    if (!role) {
      return NextResponse.json(
        { error: 'No role found in app_metadata' },
        { status: 400 }
      );
    }

    // Update profile role to match app_metadata role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Profile role synced successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
