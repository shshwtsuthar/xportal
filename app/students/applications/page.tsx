'use client';

import { useApplicationsManagement } from '@/hooks/use-applications-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationsStats } from './components/applications-stats';
import { ApplicationsFilters } from './components/applications-filters';
import { ApplicationsTable } from './components/applications-table';
import { ApplicationsPagination } from './components/applications-pagination';

export default function ApplicationsPage() {
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
    handleAcceptApplication,
    handleGenerateOfferLetter,
    handleDownloadOfferLetter,
    handleSendOfferAndAwaiting,
    handleSendOfferLetterEmail,
    handleDownloadOfferAndAwaiting,
    handleDeleteApplication,
    refreshData,
  } = useApplicationsManagement();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications Management</h1>
          <p className="text-muted-foreground">Manage student applications and enrollment process</p>
        </div>
      </div>

      {/* Statistics */}
      <ApplicationsStats 
        stats={stats}
        isLoading={isLoading}
        isError={isError}
      />

      {/* Filters */}
      <ApplicationsFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onClearSearch={handleClearSearch}
        onRefresh={refreshData}
        currentView={currentView}
        onViewChange={handleViewChange}
        totalCount={stats?.totalApplications}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationsTable
            applications={applications}
            isLoading={isLoading}
            isError={isError}
            error={error}
            searchQuery={searchQuery}
            onReject={handleRejectApplication}
            onApprove={handleApproveApplication}
            onSubmit={handleSubmitApplication}
            onAccept={handleAcceptApplication}
            onGenerateOfferLetter={handleGenerateOfferLetter}
            onDownloadOfferLetter={handleDownloadOfferLetter}
            onSendOfferAndAwaiting={handleSendOfferAndAwaiting}
            onSendOfferLetterEmail={handleSendOfferLetterEmail}
            onDownloadOfferAndAwaiting={handleDownloadOfferAndAwaiting}
            onDelete={handleDeleteApplication}
          />

          {/* Pagination */}
          <ApplicationsPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            hasNext={pagination.hasNext}
            hasPrevious={pagination.hasPrevious}
            onPageChange={handlePageChange}
            onPageSizeChange={(size) => {
              // This would need to be implemented in the hook
              console.log('Page size change:', size);
            }}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
