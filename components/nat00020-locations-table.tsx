/**
 * NAT00020 Locations Table Component
 * 
 * Displays a table of training locations with their compliance status
 * for NAT00020 AVETMISS file generation.
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { LocationValidationData } from '@/src/types/compliance-types';

interface NAT00020LocationsTableProps {
  locations: LocationValidationData[];
  isLoading?: boolean;
}

/**
 * Location status badge component
 */
const LocationStatusBadge: React.FC<{ location: LocationValidationData }> = ({ location }) => {
  const isActive = location.is_active !== false; // Default to true if undefined
  const hasRequiredFields = !!(
    location.location_identifier &&
    location.location_name &&
    location.address?.street_name &&
    location.address?.suburb &&
    location.address?.postcode &&
    location.address?.state_identifier
  );

  if (!isActive) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
        <XCircle className="size-3 mr-1" />
        Inactive
      </Badge>
    );
  }

  if (hasRequiredFields) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle2 className="size-3 mr-1" />
        Complete
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
      <AlertTriangle className="size-3 mr-1" />
      Incomplete
    </Badge>
  );
};

/**
 * Format address for display
 */
const formatAddress = (location: LocationValidationData): string => {
  if (!location.address) return 'No address';
  
  const parts = [
    location.address.building_property_name,
    location.address.flat_unit_details,
    location.address.street_number && location.address.street_name ? `${location.address.street_number} ${location.address.street_name}` : location.address.street_name,
    location.address.suburb,
    location.address.postcode
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'Incomplete address';
};

/**
 * Get state label from identifier
 */
const getStateLabel = (stateId?: string): string => {
  if (!stateId) return 'Unknown';
  
  const states: Record<string, string> = {
    '01': 'NSW',
    '02': 'VIC', 
    '03': 'QLD',
    '04': 'SA',
    '05': 'WA',
    '06': 'TAS',
    '07': 'NT',
    '08': 'ACT',
  };
  
  return states[stateId] || stateId;
};

/**
 * Loading skeleton for table rows
 */
const TableRowSkeleton: React.FC = () => (
  <TableRow>
    <TableCell>
      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted animate-pulse rounded w-full" />
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
    </TableCell>
    <TableCell>
      <div className="h-6 bg-muted animate-pulse rounded w-20" />
    </TableCell>
  </TableRow>
);

/**
 * NAT00020 Locations Table Component
 */
export const NAT00020LocationsTable: React.FC<NAT00020LocationsTableProps> = ({ 
  locations, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Location ID</TableHead>
              <TableHead className="font-medium">Location Name</TableHead>
              <TableHead className="font-medium">Address</TableHead>
              <TableHead className="font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No locations found</h3>
        <p className="text-muted-foreground">
          Add training locations to generate NAT00020 files
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Location ID</TableHead>
            <TableHead className="font-medium">Location Name</TableHead>
            <TableHead className="font-medium">Address</TableHead>
            <TableHead className="font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-sm">
                {location.location_identifier || 'Not set'}
              </TableCell>
              <TableCell className="font-medium">
                {location.location_name || 'Not set'}
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate text-sm text-muted-foreground">
                  {formatAddress(location)}
                </div>
                {location.address?.state_identifier && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {getStateLabel(location.address.state_identifier)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <LocationStatusBadge location={location} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NAT00020LocationsTable;
