import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug)
      return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agents')
      .select('name')
      .eq('slug', slug)
      .single();
    if (error || !data)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ name: data.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
