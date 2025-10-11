'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useGetLocations } from '@/src/hooks/useGetLocations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useDeleteLocation } from '@/src/hooks/useDeleteLocation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function LocationsDataTable() {
  const { data, isLoading, isError } = useGetLocations();
  const deleteMutation = useDeleteLocation();

  const rows = useMemo(() => data ?? [], [data]);

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading locations…</p>;
  if (isError)
    return (
      <p className="text-destructive text-sm">Failed to load locations.</p>
    );

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <TableHead>Location ID</TableHead>
            <TableHead>Location Name</TableHead>
            <TableHead>Street</TableHead>
            <TableHead>Suburb</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Postcode</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {rows.map((location) => (
            <TableRow key={location.id} className="divide-x">
              <TableCell>{location.location_id_internal}</TableCell>
              <TableCell>
                <Link
                  href={`/locations/${location.id}`}
                  className="text-primary hover:underline"
                >
                  {location.name}
                </Link>
              </TableCell>
              <TableCell>
                {[location.street_number, location.street_name]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </TableCell>
              <TableCell>{location.suburb || '—'}</TableCell>
              <TableCell>{location.state || '—'}</TableCell>
              <TableCell>{location.postcode || '—'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/locations/edit/${location.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Location</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the location. This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteMutation.mutateAsync(
                                  location.id as string
                                );
                                toast.success('Location deleted');
                              } catch (e) {
                                toast.error(String((e as Error).message || e));
                              }
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow className="divide-x">
              <TableCell colSpan={7}>
                <p className="text-muted-foreground text-sm">
                  No locations found.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
