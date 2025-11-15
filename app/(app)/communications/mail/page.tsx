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
import { Mail, Plus, X, Search } from 'lucide-react';
import { useComposeEmail } from '@/components/providers/compose-email';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  const [searchQuery, setSearchQuery] = useState<string>('');

  const total = list?.total ?? 0;
  const items = list?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 20)));

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery?.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter((m: EmailListItem) => {
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
        m.subject?.toLowerCase().includes(query) ||
        toDisplay.toLowerCase().includes(query) ||
        m.created_by?.toLowerCase().includes(query) ||
        m.status?.toLowerCase().includes(query) ||
        (m.sent_at &&
          new Date(m.sent_at).toLocaleString().toLowerCase().includes(query))
      );
    });
  }, [items, searchQuery]);

  const clearFilters = () =>
    setFilters({ page: 1, pageSize: filters.pageSize, sort: filters.sort });

  const handleSort = (
    column: 'created_at' | 'sent_at' | 'delivered_at' | 'status'
  ) => {
    setFilters((f) => {
      const currentSort = f.sort;
      if (currentSort?.column === column) {
        // Toggle direction or clear sort
        if (currentSort.desc) {
          return {
            ...f,
            page: 1,
            sort: { column, desc: false },
          };
        } else {
          // Clear sort by going back to default
          return {
            ...f,
            page: 1,
            sort: { column: 'created_at', desc: true },
          };
        }
      } else {
        // New column, start with descending
        return {
          ...f,
          page: 1,
          sort: { column, desc: true },
        };
      }
    });
  };

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
            <div className="border-b p-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search all columns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                  aria-label="Search emails table"
                />
              </div>
            </div>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="divide-x">
                  <TableHead>Subject</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Status</TableHead>
                  <SortableTableHead
                    onSort={() => handleSort('sent_at')}
                    sortDirection={
                      filters.sort?.column === 'sent_at'
                        ? filters.sort.desc
                          ? 'desc'
                          : 'asc'
                        : filters.sort?.column === 'created_at'
                          ? filters.sort.desc
                            ? 'desc'
                            : 'asc'
                          : null
                    }
                  >
                    Sent at
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {filteredItems.map((m: EmailListItem) => {
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
                    <TableRow
                      key={m.id}
                      className="cursor-pointer divide-x"
                      onClick={() => setSelectedId(m.id)}
                    >
                      <TableCell className="truncate px-4" title={m.subject}>
                        {m.subject}
                      </TableCell>
                      <TableCell className="truncate px-4" title={toDisplay}>
                        {toDisplay}
                      </TableCell>
                      <TableCell className="truncate px-4">
                        {m.created_by ?? '—'}
                      </TableCell>
                      <TableCell className="px-4">
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="px-4">
                        {m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow className="divide-x">
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground px-4 py-6 text-sm"
                    >
                      {searchQuery.trim()
                        ? 'No emails match your search.'
                        : 'No emails found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {filteredItems.length > 0 && (
              <div className="flex flex-col gap-4 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    Rows per page:
                  </span>
                  <Select
                    value={(filters.pageSize ?? 20).toString()}
                    onValueChange={(value) => {
                      setFilters((f) => ({
                        ...f,
                        page: 1,
                        pageSize: Number(value),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              page: Math.max(1, (f.page ?? 1) - 1),
                            }))
                          }
                          className={
                            (filters.page ?? 1) === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {Array.from(
                        { length: Math.min(totalPages, 7) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if ((filters.page ?? 1) <= 4) {
                            pageNum = i + 1;
                          } else if ((filters.page ?? 1) >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = (filters.page ?? 1) - 3 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() =>
                                  setFilters((f) => ({
                                    ...f,
                                    page: pageNum,
                                  }))
                                }
                                isActive={(filters.page ?? 1) === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              page: Math.min(totalPages, (f.page ?? 1) + 1),
                            }))
                          }
                          className={
                            (filters.page ?? 1) >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
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
