'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApplicationFormValues } from '@/lib/validators/application';
import { useGetAgents } from '@/src/hooks/useGetAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

type Props = { hideAgent?: boolean };

export const Step1_PersonalDetails = ({ hideAgent = false }: Props) => {
  const form = useFormContext<ApplicationFormValues>();

  const DateOfBirthPicker = () => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
      undefined
    );
    const dateOfBirthValue = form.watch('date_of_birth');
    const [ddmmyyyy, setDdmmyyyy] = useState('');

    // Convert ISO date string to DD/MM/YYYY format
    const formatToDDMMYYYY = (dateStr: string): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}/${month}/${year}`;
    };

    // Format input value with slashes as user types
    const formatWithSlashes = (value: string): string => {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      if (digits.length === 0) return '';
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    };

    // Convert DD/MM/YYYY or DDMMYYYY to ISO date string
    const parseDDMMYYYY = (value: string): string => {
      // Remove slashes and get only digits
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 8) return '';
      const day = digits.substring(0, 2);
      const month = digits.substring(2, 4);
      const year = digits.substring(4, 8);
      // Return ISO format YYYY-MM-DD
      return `${year}-${month}-${day}`;
    };

    // Sync local state with form value
    useEffect(() => {
      if (dateOfBirthValue) {
        const dateStr =
          typeof dateOfBirthValue === 'string'
            ? dateOfBirthValue
            : dateOfBirthValue.toISOString().split('T')[0];
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            setSelectedDate(date);
            setDdmmyyyy(formatToDDMMYYYY(dateStr));
          }
        }
      } else {
        setSelectedDate(undefined);
        setDdmmyyyy('');
      }
    }, [dateOfBirthValue]);

    return (
      <FormField
        control={form.control}
        name="date_of_birth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of birth *</FormLabel>
            <FormControl>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={ddmmyyyy}
                  maxLength={10}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Remove all non-digits to get the raw value
                    const digits = inputValue.replace(/\D/g, '');

                    // Limit to 8 digits
                    const limitedDigits = digits.slice(0, 8);

                    // Format with slashes
                    const formatted = formatWithSlashes(limitedDigits);
                    setDdmmyyyy(formatted);

                    // Update form value when we have 8 digits
                    if (limitedDigits.length === 8) {
                      const isoDate = parseDDMMYYYY(limitedDigits);
                      if (isoDate) {
                        field.onChange(isoDate);
                      }
                    } else if (limitedDigits.length === 0) {
                      field.onChange('');
                    }
                  }}
                  className="flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          const isoDate = date.toISOString().split('T')[0];
                          field.onChange(isoDate);
                          setDdmmyyyy(formatToDDMMYYYY(isoDate));
                        } else {
                          setSelectedDate(undefined);
                          field.onChange('');
                          setDdmmyyyy('');
                        }
                      }}
                      initialFocus
                      disabled={(date) => {
                        // Disable future dates
                        return date > new Date();
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const AgentSelector = () => {
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
  const samePostal = form.watch('postal_is_same_as_street');
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
          <DateOfBirthPicker />
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
                <FormLabel>Mobile phone</FormLabel>
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
                  <Input {...field} placeholder="VIC" />
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
                  <Input {...field} placeholder="3000" />
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
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Australia" />
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
                  <FormItem>
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
                      <Input {...field} placeholder="VIC" />
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
                      <Input {...field} placeholder="Australia" />
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
