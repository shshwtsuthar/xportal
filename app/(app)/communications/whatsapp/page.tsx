'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { buildUrlWithParams } from '@/lib/utils/url';
import { PageContainer } from '@/components/page-container';
import SenderTabs from '@/components/whatsapp/SenderTabs';
import ThreadList from '@/components/whatsapp/ThreadList';
import MessagePane from '@/components/whatsapp/MessagePane';
import Composer from '@/components/whatsapp/Composer';
import BulkForm from '@/components/whatsapp/BulkForm';

export default function WhatsAppPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const pathname = usePathname();
  const tab = qp.get('tab') || 'chat';
  const senderParam = qp.get('sender') || '';
  const senderId = senderParam === 'auto' ? '' : senderParam;
  const threadId = qp.get('thread') || '';

  return (
    <PageContainer title="WhatsApp" className="space-y-6">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const url = buildUrlWithParams(pathname, qp, { tab: v });
          router.push(url);
        }}
      >
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-4 md:col-span-1">
                  <SenderTabs />
                  <ThreadList senderId={senderId} selectedThreadId={threadId} />
                </div>
                <div className="space-y-4 md:col-span-3">
                  <MessagePane threadId={threadId} />
                  <Composer />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Send</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
