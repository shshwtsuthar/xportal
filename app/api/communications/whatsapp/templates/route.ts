import { getTwilioConfigForCurrentUser } from '@/lib/twilio/credentials';

type TwilioContentItem = {
  sid: string;
  friendly_name?: string | null;
  types?: Record<string, unknown> | string[] | null;
  channels?: Record<string, unknown> | null;
};

type TwilioContentResponse = {
  content?: TwilioContentItem[];
  contents?: TwilioContentItem[];
  items?: TwilioContentItem[];
};

const resolveContentItems = (
  payload: TwilioContentResponse
): TwilioContentItem[] => {
  if (Array.isArray(payload.content)) {
    return payload.content;
  }
  if (Array.isArray(payload.contents)) {
    return payload.contents;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

const hasWhatsAppChannel = (item: TwilioContentItem): boolean => {
  const { types, channels } = item;
  if (Array.isArray(types)) {
    return types.includes('whatsapp');
  }
  if (types && typeof types === 'object' && 'whatsapp' in types) {
    return true;
  }
  if (channels && typeof channels === 'object' && 'whatsapp' in channels) {
    return true;
  }
  return false;
};

export async function GET() {
  try {
    const cfg = await getTwilioConfigForCurrentUser();
    const url = 'https://content.twilio.com/v1/Content';
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
      'base64'
    );
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: 'no-store',
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(
        JSON.stringify({
          templates: [],
          error: `Twilio Content API error: ${txt}`,
        }),
        { status: 200 }
      );
    }
    const data = (await resp.json()) as TwilioContentResponse;
    const templates = resolveContentItems(data)
      .filter(hasWhatsAppChannel)
      .map((item) => ({
        sid: item.sid,
        name: item.friendly_name || item.sid,
        variables: [] as string[],
      }));
    return new Response(JSON.stringify({ templates }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ templates: [], error: msg }), {
      status: 200,
    });
  }
}
