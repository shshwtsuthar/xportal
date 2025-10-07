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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ApplicationFormValues } from '@/lib/validators/application';
import {
  useCreateDisability,
  useCreatePriorEducation,
  useDeleteDisability,
  useDeletePriorEducation,
} from '@/src/hooks/useApplicationRelations';
import {
  useGetApplicationDisabilities,
  useGetApplicationPriorEducation,
} from '@/src/hooks/useGetApplicationRelations';
import { Tables } from '@/database.types';
import { toast } from 'sonner';

type Props = {
  application: Tables<'applications'> | undefined;
};

export const Step3_AdditionalInfo = ({ application }: Props) => {
  const form = useFormContext<ApplicationFormValues>();
  const isInternational = form.watch('is_international');

  const applicationId = application?.id;

  // Fetch existing disabilities and prior education
  const { data: disabilities = [] } =
    useGetApplicationDisabilities(applicationId);
  const { data: priorEducation = [] } =
    useGetApplicationPriorEducation(applicationId);

  // Mutation hooks
  const createDisability = useCreateDisability();
  const createPriorEducation = useCreatePriorEducation();
  const deleteDisability = useDeleteDisability();
  const deletePriorEducation = useDeletePriorEducation();

  const handleAddDisability = async () => {
    if (!applicationId) {
      toast.error('Please save the application first');
      return;
    }

    // For now, we'll add a default disability type - in a real app you'd have a modal or form
    createDisability.mutate(
      { application_id: applicationId, disability_type_id: '11' }, // Hearing
      {
        onSuccess: () => toast.success('Disability added'),
        onError: (error) =>
          toast.error(`Failed to add disability: ${error.message}`),
      }
    );
  };

  const handleAddPriorEducation = async () => {
    if (!applicationId) {
      toast.error('Please save the application first');
      return;
    }

    // For now, we'll add a default prior education - in a real app you'd have a modal or form
    createPriorEducation.mutate(
      { application_id: applicationId, prior_achievement_id: '008' }, // Bachelor degree
      {
        onSuccess: () => toast.success('Prior education added'),
        onError: (error) =>
          toast.error(`Failed to add prior education: ${error.message}`),
      }
    );
  };

  const handleRemoveDisability = (id: string) => {
    deleteDisability.mutate(id, {
      onSuccess: () => toast.success('Disability removed'),
      onError: (error) =>
        toast.error(`Failed to remove disability: ${error.message}`),
    });
  };

  const handleRemovePriorEducation = (id: string) => {
    deletePriorEducation.mutate(id, {
      onSuccess: () => toast.success('Prior education removed'),
      onError: (error) =>
        toast.error(`Failed to remove prior education: ${error.message}`),
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="is_international"
          render={({ field }) => (
            <FormItem>
              <FormLabel>International student</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isInternational && (
          <>
            <FormField
              control={form.control}
              name="passport_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passport number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visa_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visa type</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visa_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visa number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country_of_citizenship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country of citizenship</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUS">Australia</SelectItem>
                        <SelectItem value="NZL">New Zealand</SelectItem>
                        <SelectItem value="CHN">China</SelectItem>
                        <SelectItem value="IND">India</SelectItem>
                        <SelectItem value="OTH">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ielts_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IELTS score</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 6.5" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      {/* NAT00090: Client Disability - one record per disability type */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Disabilities</h3>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddDisability}
            disabled={createDisability.isPending || !applicationId}
          >
            Add Disability
          </Button>
        </div>
        <div className="grid gap-2">
          {disabilities.map((disability) => (
            <div
              key={disability.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="text-sm">
                {disability.disability_type_id === '11' && 'Hearing'}
                {disability.disability_type_id === '12' && 'Physical'}
                {disability.disability_type_id === '13' && 'Intellectual'}
                {disability.disability_type_id === '14' && 'Learning'}
                {disability.disability_type_id === '15' && 'Mental illness'}
                {disability.disability_type_id === '16' &&
                  'Acquired brain impairment'}
                {disability.disability_type_id === '17' && 'Vision'}
                {disability.disability_type_id === '18' && 'Medical condition'}
                {disability.disability_type_id === '19' && 'Other'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveDisability(disability.id)}
                disabled={deleteDisability.isPending}
              >
                Remove
              </Button>
            </div>
          ))}
          {disabilities.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No disabilities recorded
            </p>
          )}
        </div>
      </div>

      {/* NAT00100: Client Prior Educational Achievement - one record per prior qualification */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Prior Education</h3>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPriorEducation}
            disabled={createPriorEducation.isPending || !applicationId}
          >
            Add Prior Education
          </Button>
        </div>
        <div className="grid gap-2">
          {priorEducation.map((education) => (
            <div
              key={education.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="text-sm">
                {education.prior_achievement_id === '008' &&
                  'Bachelor degree or higher'}
                {education.prior_achievement_id === '410' &&
                  'Advanced diploma/Diploma'}
                {education.prior_achievement_id === '420' && 'Certificate IV'}
                {education.prior_achievement_id === '430' && 'Certificate III'}
                {education.prior_achievement_id === '521' &&
                  'Statement of attainment'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePriorEducation(education.id)}
                disabled={deletePriorEducation.isPending}
              >
                Remove
              </Button>
            </div>
          ))}
          {priorEducation.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No prior education recorded
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
