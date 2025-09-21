/**
 * NAT Field Status Table Component
 * 
 * Displays a detailed table of NAT file fields with their availability status
 * using the same design pattern as the applications table.
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';

export interface NATFieldStatus {
  fieldName: string;
  displayName: string;
  isAvailable: boolean;
  isRequired: boolean;
  isOptional: boolean;
}

interface NATFieldStatusTableProps {
  fields: NATFieldStatus[];
  isLoading?: boolean;
}

/**
 * Field status badge component
 */
const FieldStatusBadge: React.FC<{ field: NATFieldStatus }> = ({ field }) => {
  if (field.isAvailable) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle2 className="size-3 mr-1" />
        Available
      </Badge>
    );
  }
  
  if (field.isRequired && !field.isAvailable) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
        <XCircle className="size-3 mr-1" />
        Not Available
      </Badge>
    );
  }
  
  // Optional field that's not available
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
      <Minus className="size-3 mr-1" />
      Optional
    </Badge>
  );
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
      <div className="h-6 bg-muted animate-pulse rounded w-20" />
    </TableCell>
  </TableRow>
);

/**
 * NAT Field Status Table Component
 */
export const NATFieldStatusTable: React.FC<NATFieldStatusTableProps> = ({ 
  fields, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Fields</TableHead>
              <TableHead className="font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Fields</TableHead>
            <TableHead className="font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {field.displayName}
              </TableCell>
              <TableCell>
                <FieldStatusBadge field={field} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
