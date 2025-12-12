'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGetProgramFields } from '@/src/hooks/useGetProgramFields';

interface FieldOption {
  id: string;
  label: string;
  isCategory?: boolean;
  categoryId?: string;
}

interface FieldOfEducationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function FieldOfEducationSelect({
  value,
  onValueChange,
  placeholder = 'Select field of education...',
}: FieldOfEducationSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(
    new Set(['01', '02', '03']) // Default expanded categories
  );

  const { data: rawFields } = useGetProgramFields();

  // Process the flat fields data into hierarchical structure
  const fields: FieldOption[] = React.useMemo(() => {
    if (!rawFields) return [];

    const processedFields: FieldOption[] = [];
    const categories = new Map<string, FieldOption>();

    rawFields.forEach((field) => {
      if (field.id.length === 2) {
        // This is a category (2-digit code)
        const category: FieldOption = {
          id: field.id,
          label: field.label,
          isCategory: true,
        };
        processedFields.push(category);
        categories.set(field.id, category);
      } else if (field.id.length === 4) {
        // This is a sub-field (4-digit code)
        const categoryId = field.id.substring(0, 2);
        processedFields.push({
          id: field.id,
          label: field.label,
          categoryId,
        });
      }
    });

    return processedFields;
  }, [rawFields]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const selectedField = fields.find((field) => field.id === value);

  // Group fields by category
  const categories = fields.filter((field) => field.isCategory);
  const getCategoryFields = (categoryId: string) =>
    fields.filter((field) => field.categoryId === categoryId);

  // Don't render if data is not loaded yet
  if (!rawFields) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        Loading...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedField ? selectedField.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search fields..." />
          <CommandList>
            <CommandEmpty>No field found.</CommandEmpty>
            {categories.map((category) => {
              const categoryFields = getCategoryFields(category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <CommandGroup key={category.id}>
                  <div className="flex items-center px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2 h-6 w-6 p-0"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="text-sm font-medium">
                      {category.id} - {category.label}
                    </span>
                  </div>
                  {isExpanded &&
                    categoryFields.map((field) => (
                      <CommandItem
                        key={field.id}
                        value={`${field.id} ${field.label}`}
                        onSelect={() => {
                          onValueChange(field.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === field.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="ml-4">
                          {field.id} - {field.label}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
