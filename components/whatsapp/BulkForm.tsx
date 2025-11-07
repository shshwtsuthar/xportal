'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useListTwilioSenders } from '@/src/hooks/useListTwilioSenders';
import { parseNamePhoneCsv } from '@/lib/csv/contacts';
import { useBulkSendWhatsApp } from '@/src/hooks/communications/whatsapp/useBulkSendWhatsApp';

export default function BulkForm() {
  const { data: senders } = useListTwilioSenders();
  const waSenders = useMemo(
    () =>
      (senders || []).filter((s) => s.channel === 'whatsapp' && s.is_active),
    [senders]
  );
  const [senderId, setSenderId] = useState('');
  const [body, setBody] = useState('');
  const [templateSid, setTemplateSid] = useState('');
  const [csvText, setCsvText] = useState('');
  const parsed = useMemo(() => parseNamePhoneCsv(csvText), [csvText]);
  const bulk = useBulkSendWhatsApp();

  const handleSend = async () => {
    await bulk.mutateAsync({
      senderId,
      body: body || undefined,
      templateSid: templateSid || undefined,
      contacts: parsed.rows,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Sender</Label>
          <Select value={senderId} onValueChange={setSenderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select sender" />
            </SelectTrigger>
            <SelectContent>
              {waSenders.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.friendly_name} ({s.phone_e164})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Template SID (optional)</Label>
          <Input
            value={templateSid}
            onChange={(e) => setTemplateSid(e.target.value)}
            placeholder="Template SID"
          />
        </div>
        <div>
          <Label>Message (required if no template)</Label>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hello {{name}} ..."
          />
        </div>
      </div>
      <div>
        <Label>CSV (Name,Phone)</Label>
        <textarea
          className="min-h-40 w-full rounded border p-2"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`John,+61412345678\nJane,+61400000000`}
        />
      </div>
      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsed.rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.phone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {parsed.errors.length > 0 && (
          <div className="text-destructive mt-2 text-sm">
            {parsed.errors.join(' • ')}
          </div>
        )}
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={
            !senderId ||
            (!body && !templateSid) ||
            parsed.rows.length === 0 ||
            bulk.isPending
          }
        >
          Send
        </Button>
      </div>
    </div>
  );
}
