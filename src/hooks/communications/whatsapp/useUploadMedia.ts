import { createClient } from '@/lib/supabase/client';

export type UploadResult = {
  url: string;
  path: string;
};

/**
 * Upload files to Supabase Storage bucket `whatsapp-media` and return public URLs.
 */
export async function uploadWhatsAppMedia(
  files: File[],
  opts: { threadId?: string } = {}
): Promise<UploadResult[]> {
  if (!files || files.length === 0) return [];
  const supabase = createClient();
  const bucket = 'whatsapp-media';
  const results: UploadResult[] = [];

  for (const file of files) {
    const base = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `${opts.threadId || 'general'}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}_${base}`;
    const { error } = await supabase.storage.from(bucket).upload(key, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    results.push({ url: data.publicUrl, path: key });
  }

  return results;
}
