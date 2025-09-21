/**
 * NAT File Status Card Component
 * 
 * Reusable status card component for displaying NAT file compliance status
 * with download functionality and missing field indicators.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Loader2,
  FileText,
  Settings,
  ExternalLink
} from 'lucide-react';
import { StatusCardProps } from '@/src/types/compliance-types';
import { useDownloadButtonState } from '@/hooks/use-nat-downloads';
import { getFieldDisplayName, analyzeNAT00010FieldStatus, analyzeNAT00020FieldStatus } from '@/lib/services/avetmiss-status-service';
import { NATFieldStatusTable } from '@/components/nat-field-status-table';
import { NAT00020LocationsTable } from '@/components/nat00020-locations-table';

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const iconProps = { className: "size-5" };
  
  switch (status) {
    case 'complete':
      return <CheckCircle {...iconProps} className="size-5 text-green-600" />;
    case 'incomplete':
      return <AlertTriangle {...iconProps} className="size-5 text-orange-600" />;
    case 'error':
      return <XCircle {...iconProps} className="size-5 text-red-600" />;
    case 'no_data':
      return <XCircle {...iconProps} className="size-5 text-gray-600" />;
    default:
      return <AlertTriangle {...iconProps} className="size-5 text-gray-600" />;
  }
};

/**
 * Status badge component
 */
const StatusBadge: React.FC<{ status: string; recordCount: number }> = ({ status, recordCount }) => {
  const getBadgeVariant = () => {
    switch (status) {
      case 'complete':
        return 'default' as const;
      case 'incomplete':
        return 'secondary' as const;
      case 'error':
      case 'no_data':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getBadgeText = () => {
    switch (status) {
      case 'complete':
        return `Ready (${recordCount} record${recordCount !== 1 ? 's' : ''})`;
      case 'incomplete':
        return 'Missing Data';
      case 'error':
        return 'Error';
      case 'no_data':
        return 'Not Configured';
      default:
        return 'Unknown';
    }
  };

  return (
    <Badge variant={getBadgeVariant()}>
      {getBadgeText()}
    </Badge>
  );
};

/**
 * Missing fields list component
 */
const MissingFieldsList: React.FC<{ fields: string[] }> = ({ fields }) => {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Missing Fields:</h4>
      <div className="space-y-1">
        {fields.slice(0, 5).map((field, index) => (
          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="size-1 rounded-full bg-orange-500" />
            <span>{getFieldDisplayName(field)}</span>
          </div>
        ))}
        {fields.length > 5 && (
          <div className="text-xs text-muted-foreground">
            ... and {fields.length - 5} more field{fields.length - 5 !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main NAT File Status Card Component
 */
export const NATFileStatusCard: React.FC<StatusCardProps> = ({
  fileType,
  status,
  onDownload,
  isDownloading,
  organisationData,
  locationsData
}) => {
  const {
    isCurrentlyDownloading,
    canDownload,
    hasError,
    handleDownload,
    buttonText,
    buttonVariant
  } = useDownloadButtonState(fileType, status);

  const getCardDescription = () => {
    switch (fileType) {
      case 'NAT00010':
        return 'Training organisation details for AVETMISS compliance';
      case 'NAT00020':
        return 'Training delivery locations for AVETMISS compliance';
      default:
        return 'AVETMISS compliance data';
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'complete':
        return 'All required fields are complete and ready for download';
      case 'incomplete':
        return `Missing ${status.missingFields.length} required field${status.missingFields.length !== 1 ? 's' : ''}`;
      case 'error':
        return status.errorMessage || 'An error occurred while checking status';
      case 'no_data':
        return status.errorMessage || 'No data configured';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'complete':
        return 'text-green-600';
      case 'incomplete':
        return 'text-orange-600';
      case 'error':
      case 'no_data':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{fileType}</CardTitle>
              <CardDescription className="text-sm">
                {getCardDescription()}
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={status.status} recordCount={status.recordCount} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Field Status Table for NAT00010 */}
        {fileType === 'NAT00010' && organisationData && (
          <NATFieldStatusTable 
            fields={analyzeNAT00010FieldStatus(organisationData)} 
            isLoading={false}
          />
        )}

        {/* Locations Table for NAT00020 */}
        {fileType === 'NAT00020' && locationsData && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Training Locations</h4>
              <p className="text-xs text-muted-foreground">
                {locationsData.length} location{locationsData.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <NAT00020LocationsTable locations={locationsData} />
          </div>
        )}

        {/* Field Status Table for NAT00020 */}
        {fileType === 'NAT00020' && locationsData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Field Status</h4>
            <NATFieldStatusTable 
              fields={analyzeNAT00020FieldStatus(locationsData)} 
              isLoading={false}
            />
          </div>
        )}

        {/* Status Section for NAT00020 (when no data) */}
        {fileType === 'NAT00020' && !locationsData && (
          <div className="flex items-start gap-3">
            <StatusIcon status={status.status} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusMessage()}
              </p>
              {status.lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(status.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Missing Fields for NAT00020 (when no data) */}
        {fileType === 'NAT00020' && !locationsData && status.status === 'incomplete' && status.missingFields.length > 0 && (
          <MissingFieldsList fields={status.missingFields} />
        )}

        {/* Error Details */}
        {status.status === 'error' && status.errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{status.errorMessage}</p>
          </div>
        )}

        {/* No Data Message */}
        {status.status === 'no_data' && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-700 mb-2">{status.errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                // Navigate to settings page
                const settingsPath = fileType === 'NAT00010' ? '/settings/organisation' : '/settings/locations';
                window.open(settingsPath, '_blank');
              }}
            >
              <Settings className="size-4 mr-2" />
              Configure {fileType === 'NAT00010' ? 'Organisation' : 'Locations'}
              <ExternalLink className="size-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Download Section */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCurrentlyDownloading && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isCurrentlyDownloading 
                  ? 'Generating file...' 
                  : canDownload 
                    ? 'Ready for download' 
                    : 'Cannot download'
                }
              </span>
            </div>
            
            <Button
              onClick={handleDownload}
              disabled={!canDownload || isCurrentlyDownloading}
              variant={buttonVariant}
              size="sm"
              className="h-8 min-w-32"
            >
              {isCurrentlyDownloading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  {buttonText}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NATFileStatusCard;
