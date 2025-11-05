'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGetEmailStats } from '@/src/hooks/useGetEmailStats';
import {
  useGetEmails,
  type EmailsFilters,
  type EmailStatus,
  type EmailListItem,
} from '@/src/hooks/useGetEmails';
import { useGetEmailById } from '@/src/hooks/useGetEmailById';
import { Mail, Plus, X } from 'lucide-react';
import { useComposeEmail } from '@/components/providers/compose-email';

const StatusBadge = ({ status }: { status: string }) => {
  const color =
    status === 'DELIVERED'
      ? 'bg-green-100 text-green-700'
      : status === 'SENT'
        ? 'bg-blue-100 text-blue-700'
        : status === 'BOUNCED' || status === 'FAILED'
          ? 'bg-red-100 text-red-700'
          : status === 'COMPLAINED'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-muted text-foreground';
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${color}`}>{status}</span>
  );
};

export default function MailPage() {
  const { open } = useComposeEmail();

  const [filters, setFilters] = useState<EmailsFilters>({
    page: 1,
    pageSize: 20,
    sort: { column: 'created_at', desc: true },
  });
  const { data: stats } = useGetEmailStats();
  const { data: list } = useGetEmails(filters);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useGetEmailById(selectedId);

  const total = list?.total ?? 0;
  const items = list?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 20)));

  const clearFilters = () =>
    setFilters({ page: 1, pageSize: filters.pageSize, sort: filters.sort });

  const statusOptions = useMemo(
    () => ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED'],
    []
  );

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mail</h1>
          <p className="text-muted-foreground text-sm">
            View and manage outbound emails
          </p>
        </div>
        <Button type="button" onClick={open} aria-label="Compose mail">
          <Plus className="mr-2 h-4 w-4" /> Compose
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats?.totalSent ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sent (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats?.sentLast7d ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Delivered (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats?.deliveredLast7d ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Failed (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats?.failedLast7d ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Mail
          </CardTitle>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Subject contains…"
                  className="h-8 w-56"
                  value={filters.subjectQuery ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      page: 1,
                      subjectQuery: e.target.value,
                    }))
                  }
                  aria-label="Subject search"
                />
                <Select
                  value={(filters.statuses?.[0] as string) ?? 'all'}
                  onValueChange={(v) => {
                    const nextStatuses: EmailStatus[] | undefined =
                      v === 'all' ? undefined : [v as EmailStatus];
                    setFilters((f) => ({
                      ...f,
                      page: 1,
                      statuses: nextStatuses,
                    }));
                  }}
                >
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filters.subjectQuery ||
                (filters.statuses && filters.statuses.length > 0)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  aria-label="Clear filters"
                >
                  <X className="mr-1 h-4 w-4" /> Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={open}
                aria-label="Compose mail"
              >
                <Mail className="mr-2 h-4 w-4" /> Mail
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-hidden rounded-md border">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Subject</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-left">Sender</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Sent at</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m: EmailListItem) => {
                  const tos = (m.email_message_participants || []).filter(
                    (p: { type: 'TO' | 'CC' | 'BCC' }) => p.type === 'TO'
                  );
                  const toDisplay =
                    tos.length === 0
                      ? '—'
                      : tos.length === 1
                        ? tos[0].email
                        : `${tos[0].email} +${tos.length - 1}`;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-muted/40 cursor-pointer border-b"
                      onClick={() => setSelectedId(m.id)}
                    >
                      <td className="truncate px-4 py-2" title={m.subject}>
                        {m.subject}
                      </td>
                      <td className="truncate px-4 py-2" title={toDisplay}>
                        {toDisplay}
                      </td>
                      <td className="truncate px-4 py-2">
                        {m.created_by ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-2">
                        {m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground px-4 py-6 text-sm"
                    >
                      No emails found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-3 py-2">
              <div className="text-muted-foreground text-sm">{total} total</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.max(1, (f.page ?? 1) - 1),
                    }))
                  }
                  aria-label="Previous page"
                  disabled={(filters.page ?? 1) <= 1}
                >
                  Prev
                </Button>
                <span className="text-sm">
                  Page {filters.page ?? 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(totalPages, (f.page ?? 1) + 1),
                    }))
                  }
                  aria-label="Next page"
                  disabled={(filters.page ?? 1) >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side drawer preview */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle className="mb-2 line-clamp-2">
            {detail?.subject ?? '—'}
          </DialogTitle>
          <div className="text-muted-foreground mb-2 flex flex-wrap gap-2 text-xs">
            <span>From: {detail?.from_email}</span>
            <span>•</span>
            <span>
              To:{' '}
              {(detail?.email_message_participants || [])
                .filter((p) => p.type === 'TO')
                .map((p) => p.email)
                .join(', ') || '—'}
            </span>
            <span>•</span>
            <span>
              Status: <Badge variant="secondary">{detail?.status ?? '—'}</Badge>
            </span>
          </div>
          <div
            className="prose max-h-[60vh] overflow-auto rounded border p-3"
            dangerouslySetInnerHTML={{ __html: detail?.html_body ?? '' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
