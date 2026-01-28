'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetAnnouncements } from '@/src/hooks/useGetAnnouncements';
import { NewAnnouncementDialog } from './_components/NewAnnouncementDialog';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageContainer } from '@/components/page-container';

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'SENT') {
    return <Badge variant="default">{status}</Badge>;
  }
  if (status === 'SCHEDULED') {
    return <Badge variant="secondary">{status}</Badge>;
  }
  if (status === 'CANCELLED') {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === 'URGENT') {
    return <Badge variant="destructive">{priority}</Badge>;
  }
  if (priority === 'HIGH') {
    return <Badge variant="default">{priority}</Badge>;
  }
  if (priority === 'LOW') {
    return <Badge variant="secondary">{priority}</Badge>;
  }
  return <Badge variant="outline">{priority}</Badge>;
};

export default function AnnouncementsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: announcements = [], isLoading } = useGetAnnouncements();

  return (
    <PageContainer
      title="Announcements"
      description="Create and manage announcements for students and applications"
      actions={
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          aria-label="Create new announcement"
        >
          New Announcement +
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            All Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              No announcements found. Create your first announcement to get
              started.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Read</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => {
                    const creatorName = announcement.created_by_profile
                      ? [
                          announcement.created_by_profile.first_name,
                          announcement.created_by_profile.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Unknown'
                      : 'Unknown';

                    return (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">
                          {announcement.subject}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={announcement.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={announcement.priority} />
                        </TableCell>
                        <TableCell>
                          {announcement.recipient_count ?? 0}
                        </TableCell>
                        <TableCell>
                          {announcement.read_count ?? 0} /{' '}
                          {announcement.recipient_count ?? 0}
                        </TableCell>
                        <TableCell>{creatorName}</TableCell>
                        <TableCell>
                          {format(
                            new Date(announcement.created_at),
                            'MMM d, yyyy HH:mm'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewAnnouncementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </PageContainer>
  );
}
