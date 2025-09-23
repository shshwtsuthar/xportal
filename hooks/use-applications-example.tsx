/**
 * Example component demonstrating how to use the application management hooks
 * This file is for reference only - not meant to be imported
 */

import React, { useState } from 'react';
import { useApplicationsManagement } from './use-applications-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ApplicationsManagementExample() {
  const {
    // Data
    applications,
    stats,
    
    // Loading states
    isLoading,
    isError,
    error,
    
    // Current state
    currentView,
    searchQuery,
    pagination,
    
    // Handlers
    handleSearch,
    handleClearSearch,
    handlePageChange,
    handleViewChange,
    handleRejectApplication,
    handleApproveApplication,
    handleSubmitApplication,
    refreshData,
  } = useApplicationsManagement();

  const [rejectReason, setRejectReason] = useState('');
  const [approvePayload, setApprovePayload] = useState({
    tuitionFeeSnapshot: 0,
    agentCommissionRateSnapshot: 0,
    action: '',
    notes: '',
  });

  if (isError) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error?.message}</p>
            <Button onClick={refreshData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.draftCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.submittedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approvedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
            <Button onClick={refreshData}>
              Refresh
            </Button>
          </div>

          {/* Tabs for different views */}
          <Tabs value={currentView} onValueChange={(value) => handleViewChange(value as any)}>
            <TabsList>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={currentView} className="mt-4">
              {/* Applications Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading applications...
                      </TableCell>
                    </TableRow>
                  ) : applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No applications found
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.clientName}</TableCell>
                        <TableCell>{app.clientEmail}</TableCell>
                        <TableCell>
                          <Badge variant={
                            app.status === 'Draft' ? 'secondary' :
                            app.status === 'Submitted' ? 'default' :
                            app.status === 'Approved' ? 'default' : 'destructive'
                          }>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {app.status === 'Draft' && (
                              <Button
                                size="sm"
                                onClick={() => app.id && handleSubmitApplication(app.id)}
                              >
                                Submit
                              </Button>
                            )}
                            {app.status === 'Submitted' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:');
                                    if (reason && app.id) handleRejectApplication(app.id, reason);
                                  }}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const tuitionFee = prompt('Tuition fee:');
                                    const commission = prompt('Commission rate:');
                                    if (tuitionFee && commission) {
                                      if (!app.id) return;
                                      handleApproveApplication(app.id, {
                                        tuitionFeeSnapshot: parseFloat(tuitionFee),
                                        agentCommissionRateSnapshot: parseFloat(commission),
                                        action: 'Approved',
                                        notes: 'Approved via management interface',
                                      });
                                    }
                                  }}
                                >
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {applications.length} of {pagination.totalItems} applications
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevious}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
