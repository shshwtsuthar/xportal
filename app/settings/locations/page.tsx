'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useToggleLocationStatus, formatAddress, getStateLabel, getLocationStatusBadgeVariant, getLocationStatusLabel } from '@/hooks/use-locations';
import { useOrganisations } from '@/hooks/use-organisations';
import { Loader2, Plus, MoreHorizontal, Edit, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// NAT00020 Location Schema for AVETMISS compliance
const locationSchema = z.object({
  organisation_id: z.string().min(1, 'Organisation is required'),
  location_identifier: z.string().min(1, 'Location identifier is required').max(10, 'Location identifier must be 10 characters or less'),
  location_name: z.string().min(1, 'Location name is required').max(100, 'Location name must be 100 characters or less'),
  address: z.object({
    building_property_name: z.string().max(50, 'Building name must be 50 characters or less').optional(),
    flat_unit_details: z.string().max(30, 'Unit details must be 30 characters or less').optional(),
    street_number: z.string().max(15, 'Street number must be 15 characters or less').optional(),
    street_name: z.string().min(1, 'Street name is required').max(70, 'Street name must be 70 characters or less'),
    suburb: z.string().min(1, 'Suburb is required').max(50, 'Suburb must be 50 characters or less'),
    postcode: z.string().regex(/^\d{4}$|^OSPC$/, 'Invalid postcode (must be 4 digits or OSPC)'),
    state_identifier: z.string().min(1, 'State is required'),
    country_identifier: z.string().optional(),
    sa1_identifier: z.string().max(11, 'SA1 identifier must be 11 characters or less').optional(),
    sa2_identifier: z.string().max(9, 'SA2 identifier must be 9 characters or less').optional(),
  }),
  is_active: z.boolean(),
});

type LocationFormData = z.infer<typeof locationSchema>;

const states = [
  { value: '01', label: 'NSW' },
  { value: '02', label: 'VIC' },
  { value: '03', label: 'QLD' },
  { value: '04', label: 'SA' },
  { value: '05', label: 'WA' },
  { value: '06', label: 'TAS' },
  { value: '07', label: 'NT' },
  { value: '08', label: 'ACT' },
];

interface LocationFormProps {
  onSuccess: () => void;
  location?: any;
}

function LocationForm({ onSuccess, location }: LocationFormProps) {
  const { data: organisations } = useOrganisations();
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  
  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      organisation_id: location?.organisation_id || '',
      location_identifier: location?.location_identifier || '',
      location_name: location?.location_name || '',
      address: {
        building_property_name: location?.address?.building_property_name || '',
        flat_unit_details: location?.address?.flat_unit_details || '',
        street_number: location?.address?.street_number || '',
        street_name: location?.address?.street_name || '',
        suburb: location?.address?.suburb || '',
        postcode: location?.address?.postcode || '',
        state_identifier: location?.address?.state_identifier || '02',
        country_identifier: location?.address?.country_identifier || '1101',
        sa1_identifier: location?.address?.sa1_identifier || '',
        sa2_identifier: location?.address?.sa2_identifier || '',
      },
      is_active: location?.is_active ?? true,
    },
  });

  const onSubmit = async (data: LocationFormData) => {
    try {
      if (location) {
        await updateLocationMutation.mutateAsync({
          id: location.id,
          data,
        });
        toast.success('Location updated successfully');
      } else {
        await createLocationMutation.mutateAsync(data);
        toast.success('Location created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(location ? 'Failed to update location' : 'Failed to create location');
      console.error('Location error:', error);
    }
  };

  const isLoading = createLocationMutation.isPending || updateLocationMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="organisation_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organisation *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organisation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {organisations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.organisation_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location_identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Identifier *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., LOC001" {...field} />
                </FormControl>
                <FormDescription>
                  Unique identifier for this location (max 10 chars)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Melbourne Campus" {...field} />
              </FormControl>
              <FormDescription>
                Display name for this training location (max 100 chars)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address.building_property_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building/Property Name</FormLabel>
                <FormControl>
                  <Input placeholder="Building name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.flat_unit_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit/Flat Details</FormLabel>
                <FormControl>
                  <Input placeholder="Unit 5, Suite 10A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address.street_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Number</FormLabel>
                <FormControl>
                  <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.street_name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Street Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Collins Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address.suburb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suburb *</FormLabel>
                <FormControl>
                  <Input placeholder="Melbourne" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.state_identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.postcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postcode *</FormLabel>
                <FormControl>
                  <Input placeholder="3000" {...field} />
                </FormControl>
                <FormDescription>
                  4-digit postcode or "OSPC" for overseas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {location ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              location ? 'Update Location' : 'Create Location'
            )}
          </Button>
    </div>
      </form>
    </Form>
  );
}

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations();
  const deleteLocationMutation = useDeleteLocation();
  const toggleStatusMutation = useToggleLocationStatus();
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteLocationMutation.mutateAsync(locationId);
        toast.success('Location deleted successfully');
      } catch (error) {
        toast.error('Failed to delete location');
        console.error('Delete error:', error);
      }
    }
  };

  const handleToggleStatus = async (locationId: string) => {
    try {
      await toggleStatusMutation.mutateAsync(locationId);
      toast.success('Location status updated successfully');
    } catch (error) {
      toast.error('Failed to update location status');
      console.error('Toggle error:', error);
    }
  };

  const handleFormSuccess = () => {
    setOpen(false);
    setEditingLocation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading locations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Locations</h1>
          <p className="text-muted-foreground">
            Manage delivery locations for AVETMISS NAT00020 compliance
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingLocation(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Edit Training Location' : 'Add Training Location'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation 
                  ? 'Update the delivery location details'
                  : 'Add a new delivery location for training activities'
                }
              </DialogDescription>
            </DialogHeader>
            <LocationForm onSuccess={handleFormSuccess} location={editingLocation} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location ID</TableHead>
                <TableHead>Location Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations?.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-mono">{location.location_identifier}</TableCell>
                  <TableCell>{location.location_name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {formatAddress(location.address)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getStateLabel(location.address.state_identifier)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLocationStatusBadgeVariant(location.is_active)}>
                      {getLocationStatusLabel(location.is_active)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(location.id)}>
                          {location.is_active ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(location.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}