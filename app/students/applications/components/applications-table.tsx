'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ApplicationSummary } from '@/hooks/use-applications-status';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';

interface ApplicationsTableProps {
  applications: ApplicationSummary[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  searchQuery?: string;
  onReject?: (applicationId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  onApprove?: (applicationId: string, payload: any) => Promise<{ success: boolean; error?: string }>;
  onSubmit?: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
  onAccept?: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
  onSendOfferAndAwaiting?: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
  onDownloadOfferAndAwaiting?: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
  onView?: (applicationId: string) => void;
  onDelete?: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
}

const statusConfig = {
  Draft: {
    variant: 'secondary' as const,
    icon: <Clock className="h-3 w-3" />,
    color: 'text-muted-foreground',
  },
  Submitted: {
    variant: 'default' as const,
    icon: <FileText className="h-3 w-3" />,
    color: 'text-primary',
  },
  Approved: {
    variant: 'default' as const,
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-foreground',
  },
  Rejected: {
    variant: 'destructive' as const,
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-destructive',
  },
};

export function ApplicationsTable({
  applications,
  isLoading,
  isError,
  error,
  searchQuery,
  onReject,
  onApprove,
  onSubmit,
  onAccept,
  onSendOfferAndAwaiting,
  onDownloadOfferAndAwaiting,
  onView,
  onDelete,
}: ApplicationsTableProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleReject = async (applicationId: string) => {
    if (!rejectReason.trim() || !onReject) return;
    
    setProcessingId(applicationId);
    try {
      const result = await onReject(applicationId, rejectReason);
      if (result.success) {
        setShowRejectDialog(null);
        setRejectReason('');
      } else {
        alert(`Failed to reject application: ${result.error}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!onApprove) return;
    
    setProcessingId(applicationId);
    try {
      const result = await onApprove(applicationId, {
        tuitionFeeSnapshot: 5000, // This should come from a form
        agentCommissionRateSnapshot: 15, // This should come from a form
        action: 'Approved',
        notes: 'Approved via management interface',
      });
      
      if (result.success) {
        setShowApproveDialog(null);
      } else {
        alert(`Failed to approve application: ${result.error}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubmit = async (applicationId: string) => {
    if (!onSubmit) return;
    
    setProcessingId(applicationId);
    try {
      const result = await onSubmit(applicationId);
      if (!result.success) {
        alert(`Failed to submit application: ${result.error}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.Draft;
  };

  const openCoeFilePickerAndUpload = (applicationId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = (input.files && input.files[0]) || null;
      if (!file) return;
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const res = await fetch(`${FUNCTIONS_URL}/applications/${applicationId}/coe`, {
          method: 'POST',
          headers: { ...getFunctionHeaders(), 'Content-Type': 'application/pdf' },
          body: buf,
        });
        if (!res.ok) {
          const err = await res.text();
          alert(`Failed to upload CoE: ${err || res.statusText}`);
          return;
        }
        alert('CoE uploaded successfully.');
      } catch (e: any) {
        alert(`Failed to upload CoE: ${e?.message || 'Unknown error'}`);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert>
        <AlertDescription>
          Error loading applications: {error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
        <p className="text-muted-foreground">
          {searchQuery ? 'Try adjusting your search criteria' : 'No applications match the current filters'}
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => {
            const statusConfig = getStatusConfig(app.status || 'Draft');
            const isProcessing = processingId === app.id;
            
            return (
              <TableRow key={app.id} className={isProcessing ? 'opacity-50' : ''}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <span>{app.clientName}</span>
                    {app.programName && (
                      <Badge variant="outline" className="text-xs">
                        {app.programName}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{app.clientEmail}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
                    {statusConfig.icon}
                    <span>{app.status}</span>
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(app.createdAt || new Date().toISOString())}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isProcessing}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(app.id || '')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      
                      {(app.status || 'Draft') === 'Draft' && onSubmit && (
                        <DropdownMenuItem 
                          onClick={() => handleSubmit(app.id || '')}
                          disabled={isProcessing}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Submit for Review
                        </DropdownMenuItem>
                      )}
                      
                      {(app.status || 'Draft') === 'Submitted' && (
                        <>
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (!onDownloadOfferAndAwaiting) return;
                              setProcessingId(app.id || null);
                              try {
                                const { downloadLatestOffer } = await import('@/hooks/use-application-actions');
                                await downloadLatestOffer(app.id || '');
                                await onDownloadOfferAndAwaiting(app.id || '');
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={isProcessing}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Download Offer Letter & mark as Awaiting Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (!onSendOfferAndAwaiting) return;
                              setProcessingId(app.id || null);
                              try {
                                await onSendOfferAndAwaiting(app.id || '');
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={isProcessing}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Send Offer Letter & mark as Awaiting Payment
                          </DropdownMenuItem>
                        </>
                      )}

                      {(app.status || 'Draft') === 'Submitted' && onReject && (
                        <DropdownMenuItem 
                          onClick={() => setShowRejectDialog(app.id || '')}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </DropdownMenuItem>
                      )}
                      
                      {/* No Approve on Submitted per flow */}

                      {String(app.status || '') === 'AwaitingPayment' && (
                        <>
                          <DropdownMenuItem 
                            onClick={async () => {
                              if (!onAccept) return;
                              setProcessingId(app.id || null);
                              try {
                                await onAccept(app.id || '');
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept
                          </DropdownMenuItem>
                          {onReject && (
                            <DropdownMenuItem 
                              onClick={() => setShowRejectDialog(app.id || '')}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {String(app.status || '') === 'Accepted' && (
                        <>
                          {onApprove && (
                            <DropdownMenuItem 
                              onClick={() => setShowApproveDialog(app.id || '')}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => openCoeFilePickerAndUpload(app.id || '')}
                            disabled={isProcessing}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Upload CoE (PDF)
                          </DropdownMenuItem>
                          {onReject && (
                            <DropdownMenuItem 
                              onClick={() => setShowRejectDialog(app.id || '')}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {/* Delete button - available for all statuses */}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={async () => {
                            if (!onDelete) return;
                            setProcessingId(app.id || null);
                            try {
                              const result = await onDelete(app.id || '');
                              if (!result.success) {
                                alert(`Failed to delete application: ${result.error || 'Unknown error'}`);
                              }
                            } catch (error: any) {
                              alert(`Failed to delete application: ${error?.message || 'Unknown error'}`);
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          disabled={isProcessing}
                          className="text-destructive focus:text-destructive border-t border-border mt-1 pt-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Application
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Application</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(showRejectDialog)}
                  disabled={!rejectReason.trim() || processingId === showRejectDialog}
                >
                  {processingId === showRejectDialog ? 'Rejecting...' : 'Reject Application'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Approve Application</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This will approve the application and create the enrollment record. 
                The student will be notified of their acceptance.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveDialog(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleApprove(showApproveDialog)}
                  disabled={processingId === showApproveDialog}
                >
                  {processingId === showApproveDialog ? 'Approving...' : 'Approve Application'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
