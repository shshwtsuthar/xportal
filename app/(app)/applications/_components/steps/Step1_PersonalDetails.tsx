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

type Props = { hideAgent?: boolean };

export const Step1_PersonalDetails = ({ hideAgent = false }: Props) => {
  const form = useFormContext<ApplicationFormValues>();
  const AgentSelector = () => {
    const { data: agents = [] } = useGetAgents();
    return (
      <FormField
        control={form.control}
        name="agent_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent</FormLabel>
            <FormControl>
              <Select
                value={field.value ?? undefined}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger>
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
                <FormLabel>First name</FormLabel>
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
                <FormLabel>Last name</FormLabel>
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
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={field.onChange}
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
          <CardContent className="grid gap-4 md:grid-cols-2">
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
                <FormLabel>Email</FormLabel>
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
                <FormLabel>Suburb</FormLabel>
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
                <FormLabel>State</FormLabel>
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
                <FormLabel>Postcode</FormLabel>
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
                    My postal address is the same as my street address
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
