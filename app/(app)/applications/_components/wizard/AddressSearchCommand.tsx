'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, MapPin, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AddressSuggestion,
  useAddressAutocomplete,
} from '@/src/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';

type AddressSearchCommandProps = {
  onSelect: (suggestion: AddressSuggestion) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  sortOrigin?: {
    lat: number;
    lon: number;
  };
  debounceMs?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * AddressSearchCommand renders a trigger button that opens a Command dialog
 * where users can search for Australian addresses using the Mappify Autocomplete API.
 *
 * @param props.onSelect callback fired with the selected suggestion
 * @param props.sortOrigin optional coordinates to bias search results
 */
export const AddressSearchCommand = ({
  onSelect,
  sortOrigin,
  label = 'Search address',
  description = 'Powered by Mappify Autocomplete',
  placeholder = 'Start typing an address…',
  debounceMs = 300,
  disabled = false,
  className,
}: AddressSearchCommandProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { suggestions, isFetching, isLoading, isError, error, isIdle } =
    useAddressAutocomplete({
      query: search,
      sortOrigin,
      debounceMs,
      enabled: open,
    });

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch('');
    }
  }, []);

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      onSelect(suggestion);
      setOpen(false);
      setSearch('');
    },
    [onSelect]
  );

  const statusMessage = useMemo(() => {
    if (!search) {
      return 'Type at least three characters to search';
    }
    if (isError) {
      return error instanceof Error
        ? error.message
        : 'Unable to fetch addresses';
    }
    if (isIdle) {
      return 'Keep typing to see suggestions';
    }
    if (!suggestions.length && !isFetching && !isLoading) {
      return 'No matches found';
    }
    return null;
  }, [
    search,
    isError,
    error,
    isIdle,
    suggestions.length,
    isFetching,
    isLoading,
  ]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start gap-2',
          className
        )}
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
        aria-label="Search and autofill address"
      >
        <MapPin className="size-4" aria-hidden="true" />
        <span className="truncate text-left">{label}</span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search address"
        description={description}
      >
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={placeholder}
          aria-label="Address search input"
        />
        <CommandList className="scrollbar-none">
          {(isLoading || isFetching) && (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Fetching suggestions…</span>
            </div>
          )}
          <CommandGroup heading="Suggestions">
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion.id}
                value={suggestion.label}
                onSelect={() => handleSelect(suggestion)}
                aria-label={`Use address ${suggestion.label}`}
                className="data-[selected=true]:bg-sidebar-accent data-[selected=true]:text-sidebar-accent-foreground"
              >
                <SearchIcon
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <span className="text-sm leading-tight font-medium">
                    {suggestion.label}
                  </span>
                  {suggestion.subLabel && (
                    <span className="text-muted-foreground text-xs">
                      {suggestion.subLabel}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {statusMessage && <CommandEmpty>{statusMessage}</CommandEmpty>}
        </CommandList>
      </CommandDialog>
    </>
  );
};
