'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetStudentAnnouncements } from '@/src/hooks/useGetStudentAnnouncements';
import { useMarkAnnouncementAsRead } from '@/src/hooks/useMarkAnnouncementAsRead';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  studentId: string | null;
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

export function StudentAnnouncementsCard({ studentId }: Props) {
  const { data: announcements = [], isLoading } =
    useGetStudentAnnouncements(studentId);
  const { mutateAsync: markAsRead } = useMarkAnnouncementAsRead();
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<
    Set<string>
  >(new Set());

  const handleMarkAsRead = async (
    announcementId: string,
    isAlreadyRead: boolean
  ) => {
    if (isAlreadyRead || !studentId) {
      return;
    }

    try {
      await markAsRead({ announcementId, studentId });
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
    }
  };

  const handleToggleExpand = async (
    announcementId: string,
    isRead: boolean
  ) => {
    setExpandedAnnouncements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId);
      } else {
        newSet.add(announcementId);
        // Mark as read when expanding (if not already read)
        if (!isRead && studentId) {
          handleMarkAsRead(announcementId, isRead);
        }
      }
      return newSet;
    });
  };

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return (
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Announcements</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No announcements at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const isExpanded = expandedAnnouncements.has(announcement.id);
              const isRead = announcement.is_read;

              return (
                <div
                  key={announcement.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    !isRead && 'border-primary/50 bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4
                            className={cn(
                              'font-semibold',
                              !isRead && 'font-bold'
                            )}
                          >
                            {announcement.subject}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <PriorityBadge priority={announcement.priority} />
                            <span className="text-muted-foreground text-xs">
                              {format(
                                new Date(announcement.created_at),
                                'MMM d, yyyy'
                              )}
                            </span>
                            {!isRead && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-2">
                          <p className="text-sm whitespace-pre-wrap">
                            {announcement.body}
                          </p>
                          {announcement.tags &&
                            announcement.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {announcement.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {announcement.body}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleExpand(announcement.id, isRead)
                          }
                          className="h-7 text-xs"
                          aria-label={
                            isExpanded ? 'Collapse' : 'Expand announcement'
                          }
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="mr-1 h-3 w-3" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 h-3 w-3" />
                              Show More
                            </>
                          )}
                        </Button>
                        {!isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleMarkAsRead(announcement.id, isRead)
                            }
                            className="h-7 text-xs"
                            aria-label="Mark as read"
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
