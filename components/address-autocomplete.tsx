// =============================================================================
// COMPONENT: AddressAutocomplete
// Purpose: Reusable address autocomplete input component following design system
// =============================================================================

'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useAddressAutocomplete } from '@/hooks/use-address-autocomplete';
import { mapAddressableResponse } from '@/lib/data/address-mapping';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/schemas/application-schemas';

// Local type definition for address autocomplete response
interface AddressableAddress {
  streetNumber: string;
  streetName: string;
  unitDetails?: string;
  buildingName?: string;
  suburb: string;
  state: string;
  postcode: string;
  formatted: string;
}

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: Address) => void;
  error?: string;
  disabled?: boolean;
  country?: 'AU' | 'NZ';
}

export const AddressAutocomplete = ({
  label,
  placeholder = "Start typing an address...",
  value,
  onChange,
  onAddressSelect,
  error,
  disabled = false,
  country = 'AU',
}: AddressAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, loading, error: apiError, searchAddresses, clearSuggestions } = useAddressAutocomplete({
    country,
    debounceMs: 300,
    minQueryLength: 3,
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length >= 3) {
      searchAddresses(newValue);
      setOpen(true);
      setSelectedIndex(-1);
    } else {
      clearSuggestions();
      setOpen(false);
      setSelectedIndex(-1);
    }
  };

  // Handle address selection
  const handleAddressSelect = (address: AddressableAddress) => {
    const mappedAddress: Address = {
      streetNumber: address.streetNumber,
      streetName: address.streetName,
      unitDetails: address.unitDetails || undefined,
      buildingName: address.buildingName || undefined,
      suburb: address.suburb,
      state: address.state as any, // Type assertion since we know it's valid
      postcode: address.postcode,
    };
    
    onChange(address.formatted);
    onAddressSelect(mappedAddress);
    setOpen(false);
    clearSuggestions();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleAddressSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        clearSuggestions();
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle manual entry
  const handleManualEntry = () => {
    setOpen(false);
    clearSuggestions();
    setSelectedIndex(-1);
  };

  return (
    <div className="relative space-y-2">
      <Label htmlFor="address-autocomplete">{label}</Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-autocomplete"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "mt-2",
            error && "border-destructive"
          )}
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
          <Command>
            <CommandList>
              <CommandEmpty>
                {loading ? "Searching..." : "No addresses found."}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((address, index) => (
                    <CommandItem
                      key={`${address.streetNumber}-${address.streetName}-${address.suburb}`}
                      value={address.formatted}
                      onSelect={() => handleAddressSelect(address)}
                      className={cn(
                        "flex flex-col items-start p-3",
                        index === selectedIndex && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="font-medium text-sm">{address.formatted}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {address.suburb}, {address.state} {address.postcode}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Error message */}
      {(error || apiError) && (
        <p className="text-sm text-destructive">
          {error || apiError}
        </p>
      )}

      {/* Manual entry button */}
      {open && suggestions.length > 0 && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualEntry}
            className="text-sm"
          >
            Enter address manually
          </Button>
        </div>
      )}
    </div>
  );
};