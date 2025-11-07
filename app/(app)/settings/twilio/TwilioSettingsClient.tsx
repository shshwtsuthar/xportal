'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetTwilioConfig } from '@/src/hooks/useGetTwilioConfig';
import { useUpsertTwilioConfig } from '@/src/hooks/useUpsertTwilioConfig';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';
import { useCreateTwilioSender } from '@/src/hooks/useCreateTwilioSender';
import { useUpdateTwilioSender } from '@/src/hooks/useUpdateTwilioSender';
import { useDeleteTwilioSender } from '@/src/hooks/useDeleteTwilioSender';
import { useTestTwilioConfig } from '@/src/hooks/settings/twilio/useTestTwilioConfig';
import type { TwilioConfig } from '@/src/hooks/useGetTwilioConfig';
import type { TwilioSender } from '@/src/hooks/useListTwilioSenders';

type TwilioSettingsClientProps = {
  initialConfig: TwilioConfig | null;
  initialSenders: TwilioSender[] | null;
};

function WebhookUrls() {
  const webhookBase = '/api/communications/whatsapp';
  const inbound = `${webhookBase}/webhook`;
  const status = `${webhookBase}/status`;
  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Inbound Webhook URL</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input readOnly value={inbound} />
          <Button variant="outline" onClick={() => handleCopy(inbound)}>
            Copy
          </Button>
        </div>
      </div>
      <div>
        <Label>Status Callback URL</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input readOnly value={status} />
          <Button variant="outline" onClick={() => handleCopy(status)}>
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}

function AccountConfigCard({
  initialConfig,
}: {
  initialConfig: TwilioConfig | null;
}) {
  const { data, isLoading } = useGetTwilioConfig({
    initialData: initialConfig ?? undefined,
  });
  const upsert = useUpsertTwilioConfig();
  const testConn = useTestTwilioConfig();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [messagingSid, setMessagingSid] = useState('');
  const [validateWebhooks, setValidateWebhooks] = useState(true);
  const hasInitializedRef = useRef(false);

  const hasExisting = useMemo(
    () => Boolean(data?.account_sid || data?.auth_token_masked),
    [data]
  );

  useEffect(() => {
    if (data && !isLoading && !hasInitializedRef.current) {
      if (data.account_sid) {
        setAccountSid(data.account_sid);
      }
      if (data.messaging_service_sid) {
        setMessagingSid(data.messaging_service_sid);
      }
      if (typeof data.validate_webhooks === 'boolean') {
        setValidateWebhooks(data.validate_webhooks);
      }
      hasInitializedRef.current = true;
    }
  }, [data, isLoading]);

  const handleSave = async () => {
    await upsert.mutateAsync({
      account_sid: accountSid || undefined,
      auth_token: authToken || undefined,
      messaging_service_sid: messagingSid || null,
      validate_webhooks: validateWebhooks,
    });
    setAuthToken('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twilio Account</CardTitle>
        <CardDescription>
          Configure Account SID, Auth Token, and defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Account SID</Label>
                <Input
                  placeholder={
                    data?.account_sid || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                  }
                  value={accountSid}
                  onChange={(event) => setAccountSid(event.target.value)}
                />
              </div>
              <div>
                <Label>Auth Token (write-only)</Label>
                <Input
                  type="password"
                  placeholder={data?.auth_token_masked || '********'}
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                />
              </div>
              <div>
                <Label>Messaging Service SID (optional)</Label>
                <Input
                  placeholder={
                    data?.messaging_service_sid ||
                    'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                  }
                  value={messagingSid}
                  onChange={(event) => setMessagingSid(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={validateWebhooks}
                  onCheckedChange={setValidateWebhooks}
                  id="validate-webhooks"
                />
                <Label htmlFor="validate-webhooks">
                  Validate Twilio webhook signatures
                </Label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => testConn.mutate()}
                disabled={testConn.isPending}
              >
                Test Connection
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                Save
              </Button>
            </div>

            <div className="pt-2">
              <WebhookUrls />
            </div>

            {hasExisting && (
              <p className="text-muted-foreground mt-2 text-xs">
                Token is masked and stored encrypted server-side. Provide a new
                token to rotate.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SenderManagementCard({
  initialSenders,
}: {
  initialSenders: TwilioSender[] | null;
}) {
  const { data: senders, isLoading } = useListTwilioSenders({
    initialData: initialSenders ?? undefined,
  });
  const createSender = useCreateTwilioSender();
  const updateSender = useUpdateTwilioSender();
  const deleteSender = useDeleteTwilioSender();

  const [open, setOpen] = useState(false);
  const [friendlyName, setFriendlyName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | ''>('');
  const [description, setDescription] = useState('');
  const [phoneSid, setPhoneSid] = useState('');
  const [senderSid, setSenderSid] = useState('');

  const resetDialog = () => {
    setFriendlyName('');
    setPhone('');
    setChannel('');
    setDescription('');
    setPhoneSid('');
    setSenderSid('');
  };

  const handleAdd = async () => {
    await createSender.mutateAsync({
      friendly_name: friendlyName,
      phone_e164: phone,
      channel: channel as 'whatsapp' | 'sms',
      description: description || null,
      phone_number_sid: phoneSid || null,
      sender_sid: senderSid || null,
    });
    resetDialog();
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Senders</CardTitle>
            <CardDescription>Manage WhatsApp/SMS senders</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Sender</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Sender</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Friendly name</Label>
                  <Input
                    value={friendlyName}
                    onChange={(event) => setFriendlyName(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone (+E.164)</Label>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+61xxxxxxxxx"
                  />
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select
                    value={channel}
                    onValueChange={(value) =>
                      setChannel(value as 'whatsapp' | 'sms')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone Number SID (optional)</Label>
                  <Input
                    value={phoneSid}
                    onChange={(event) => setPhoneSid(event.target.value)}
                    placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <Label>Sender SID (optional)</Label>
                  <Input
                    value={senderSid}
                    onChange={(event) => setSenderSid(event.target.value)}
                    placeholder="SExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={
                    createSender.isPending ||
                    !friendlyName ||
                    !phone ||
                    !channel
                  }
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(senders || []).map((sender) => (
                <TableRow key={sender.id}>
                  <TableCell>{sender.friendly_name}</TableCell>
                  <TableCell>{sender.phone_e164}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sender.channel === 'whatsapp' ? 'default' : 'secondary'
                      }
                    >
                      {sender.channel.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[28ch] truncate">
                    {sender.description || '-'}
                  </TableCell>
                  <TableCell>
                    {sender.is_active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await updateSender.mutateAsync({
                          id: sender.id,
                          is_active: !sender.is_active,
                        });
                      }}
                    >
                      {sender.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        await deleteSender.mutateAsync(sender.id);
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function TwilioSettingsClient({
  initialConfig,
  initialSenders,
}: TwilioSettingsClientProps) {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Twilio Settings
        </h1>
      </div>
      <AccountConfigCard initialConfig={initialConfig} />
      <SenderManagementCard initialSenders={initialSenders} />
    </div>
  );
}
