'use client';

import { useMemo, useRef, useState } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [results, setResults] = useState<
    Array<{ phone: string; ok: boolean; sid?: string; error?: string }>
  >([]);
  const [dryRunInfo, setDryRunInfo] = useState<string | null>(null);

  const handleSend = async () => {
    const res = await bulk.mutateAsync({
      senderId,
      body: body || undefined,
      templateSid: templateSid || undefined,
      contacts: parsed.rows,
    });
    setResults(res.results);
  };

  const handleUploadCsv = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const handleDryRun = () => {
    const success = parsed.rows.length;
    const errors = parsed.errors.length;
    const msg = `Rows: ${success + errors}. Valid: ${success}. Errors: ${errors}.`;
    setDryRunInfo(msg);
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
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadCsv(f);
            }}
          />
          <Button
            variant="secondary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV
          </Button>
          <Button variant="outline" type="button" onClick={handleDryRun}>
            Dry run
          </Button>
          {dryRunInfo && (
            <span className="text-muted-foreground text-xs">{dryRunInfo}</span>
          )}
        </div>
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
      {results.length > 0 && (
        <Card className="p-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm">Results</div>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                const lines = [
                  'phone,ok,sid,error',
                  ...results.map(
                    (r) =>
                      `${r.phone},${r.ok},${r.sid || ''},${(r.error || '').replace(/,/g, ';')}`
                  ),
                ];
                const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'bulk-results.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SID</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.ok ? 'OK' : 'Failed'}</TableCell>
                  <TableCell>{r.sid || ''}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.error || ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
