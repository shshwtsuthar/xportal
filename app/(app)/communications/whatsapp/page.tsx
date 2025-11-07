'use client';

import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import SenderTabs from '@/components/whatsapp/SenderTabs';
import ThreadList from '@/components/whatsapp/ThreadList';
import MessagePane from '@/components/whatsapp/MessagePane';
import Composer from '@/components/whatsapp/Composer';
import BulkForm from '@/components/whatsapp/BulkForm';

export default function WhatsAppPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const tab = qp.get('tab') || 'chat';
  const senderId = qp.get('sender') || '';
  const threadId = qp.get('thread') || '';

  useEffect(() => {
    if (!tab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'chat');
      router.replace(url.toString());
    }
  }, [tab, router]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', v);
          router.push(url.toString());
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
    </div>
  );
}
