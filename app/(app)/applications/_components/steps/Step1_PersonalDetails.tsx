'use client';

import { useCallback, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';
import { StateSelect } from '@/components/ui/state-select';
import {
  ApplicationFormValues,
  OVERSEAS_POSTCODE,
  OVERSEAS_STATE_CODE,
} from '@/src/lib/applicationSchema';
import { useGetAgents } from '@/src/hooks/useGetAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressSearchCommand } from '@/app/(app)/applications/_components/wizard/AddressSearchCommand';
import type { AddressSuggestion } from '@/src/hooks/useAddressAutocomplete';

// Extracted to avoid re-creation on every parent render which can close dropdowns
const AgentSelector = () => {
  const form = useFormContext<ApplicationFormValues>();
  const { data: agents = [] } = useGetAgents();
  return (
    <FormField
      control={form.control}
      name="agent_id"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>Agent</FormLabel>
          <FormControl>
            <Select
              value={field.value ?? undefined}
              onValueChange={(v) => field.onChange(v || undefined)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id as string}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type Props = { hideAgent?: boolean };

export const Step1_PersonalDetails = ({ hideAgent = false }: Props) => {
  const form = useFormContext<ApplicationFormValues>();

  const samePostal = form.watch('postal_is_same_as_street');
  const isInternational = useWatch({
    control: form.control,
    name: 'is_international',
  });
  const streetCountry = useWatch({
    control: form.control,
    name: 'street_country',
  });
  const postalCountry = useWatch({
    control: form.control,
    name: 'postal_country',
  });
  const setFieldValue = useCallback(
    (field: keyof ApplicationFormValues, value: string) => {
      form.setValue(field, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    },
    [form]
  );

  // Pre-fill street address state/postcode for international students (AVETMISS OVS/OSPC)
  // Note: Only applies to street address, not postal address
  useEffect(() => {
    if (isInternational !== true) return;
    form.setValue('state', OVERSEAS_STATE_CODE, {
      shouldDirty: true,
      shouldValidate: false,
    });
    form.setValue('postcode', OVERSEAS_POSTCODE, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [isInternational, form]);

  const handleStreetSearchSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      const { fields } = suggestion;
      setFieldValue('street_building_name', fields.street_building_name);
      setFieldValue('street_unit_details', fields.street_unit_details);
      setFieldValue('street_number_name', fields.street_number_name);
      setFieldValue('street_po_box', fields.street_po_box);
      setFieldValue('suburb', fields.suburb);
      setFieldValue('state', fields.state);
      setFieldValue('postcode', fields.postcode);
      setFieldValue('street_country', fields.street_country);

      if (form.getValues('postal_is_same_as_street')) {
        setFieldValue('postal_building_name', fields.street_building_name);
        setFieldValue('postal_unit_details', fields.street_unit_details);
        setFieldValue('postal_number_name', fields.street_number_name);
        setFieldValue('postal_po_box', fields.street_po_box);
        setFieldValue('postal_suburb', fields.suburb);
        setFieldValue('postal_state', fields.state);
        setFieldValue('postal_postcode', fields.postcode);
        setFieldValue('postal_country', fields.street_country);
      }
    },
    [form, setFieldValue]
  );

  const handlePostalSearchSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      const { fields } = suggestion;
      form.setValue('postal_is_same_as_street', false, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      setFieldValue('postal_building_name', fields.street_building_name);
      setFieldValue('postal_unit_details', fields.street_unit_details);
      setFieldValue('postal_number_name', fields.street_number_name);
      setFieldValue('postal_po_box', fields.street_po_box);
      setFieldValue('postal_suburb', fields.suburb);
      setFieldValue('postal_state', fields.state);
      setFieldValue('postal_postcode', fields.postcode);
      setFieldValue('postal_country', fields.street_country);
    },
    [form, setFieldValue]
  );

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Personal details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="salutation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salutation</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mr/Ms/Dr" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="middle_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Middle name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Alexander" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Smith" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Johnny" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Date of birth */}
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth *</FormLabel>
                <FormControl>
                  <DateInput
                    value={field.value}
                    onChange={(value) => field.onChange(value || '')}
                    onBlur={(e) => {
                      field.onBlur();
                      form.trigger('date_of_birth');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {!hideAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Agent</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <AgentSelector />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Contact details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    placeholder="john@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="work_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(03) 9999 9999" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile phone *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="0400 000 000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="alternative_email"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Alternative email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    placeholder="backup@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Street address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <AddressSearchCommand
              onSelect={handleStreetSearchSelect}
              label="Search street address"
              placeholder="e.g. 252 Botany Road"
            />
          </div>
          <FormField
            control={form.control}
            name="street_building_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Sunset Towers" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="street_unit_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit/Level</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Unit 10 / Level 2" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="street_number_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street number and name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="123 Example St" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="street_po_box"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Box</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="PO Box 123" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="suburb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suburb *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Richmond" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <StateSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    countryCode={streetCountry}
                    allowOverseas={isInternational === true}
                    placeholder="VIC"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postcode *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={isInternational ? 'OSPC' : '3000'}
                    readOnly={isInternational === true}
                    aria-readonly={isInternational === true}
                    className={isInternational ? 'bg-muted' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="street_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Country
                  {isInternational === true && ' *'}
                </FormLabel>
                <FormControl>
                  <CountrySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select country"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Postal address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="postal_is_same_as_street"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div>
                  <FormLabel>
                    The postal address is same as street address
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {!samePostal && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <AddressSearchCommand
                  onSelect={handlePostalSearchSelect}
                  label="Search postal address"
                  placeholder="e.g. PO Box 123 Richmond"
                />
              </div>
              <FormField
                control={form.control}
                name="postal_building_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal building name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sunset Towers" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_unit_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal unit/level</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Unit 10 / Level 2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_number_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Postal street number/name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Example St" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_po_box"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal PO Box</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PO Box 123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal suburb</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Richmond" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal state</FormLabel>
                    <FormControl>
                      <StateSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        countryCode={postalCountry}
                        placeholder="VIC"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal postcode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="3000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal country</FormLabel>
                    <FormControl>
                      <CountrySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Emergency contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="ec_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency contact name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Jane Smith" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ec_relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mother" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ec_phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="0400 000 000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Parent / Guardian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="g_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John Smith" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="g_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    placeholder="guardian@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="g_phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(03) 9999 9999" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
