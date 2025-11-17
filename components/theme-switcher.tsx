'use client';

import * as React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: string;
  label: string;
  category?: 'light' | 'dark';
};

/**
 * Generate theme options programmatically
 */
const generateThemes = (): ThemeOption[] => {
  const lightColorNames = [
    'red',
    'green',
    'blue',
    'purple',
    'orange',
    'pink',
    'teal',
    'indigo',
    'amber',
    'emerald',
    'cyan',
    'rose',
  ];

  const darkColorNames = [
    'red',
    'green',
    'blue',
    'purple',
    'orange',
    'pink',
    'teal',
  ];

  const lightThemes: ThemeOption[] = lightColorNames.map((color) => ({
    value: `${color}-light`,
    label: `${color.charAt(0).toUpperCase() + color.slice(1)} Light`,
    category: 'light',
  }));

  const darkThemes: ThemeOption[] = darkColorNames.map((color) => ({
    value: `${color}-dark`,
    label: `${color.charAt(0).toUpperCase() + color.slice(1)} Dark`,
    category: 'dark',
  }));

  // Add monochrome as the 8th dark theme
  const monochromeTheme: ThemeOption = {
    value: 'monochrome',
    label: 'Monochrome',
    category: 'dark',
  };

  return [...lightThemes, ...darkThemes, monochromeTheme];
};

const themes = generateThemes();

type ThemeCardProps = {
  theme: ThemeOption;
  isActive: boolean;
  onClick: () => void;
};

/**
 * Get color swatch gradient based on theme value
 */
const getThemeSwatch = (themeValue: string): string => {
  const colorMap: Record<string, string> = {
    // Light themes (first 12)
    'red-light': 'from-red-50 to-red-100',
    'green-light': 'from-green-50 to-green-100',
    'blue-light': 'from-blue-50 to-blue-100',
    'purple-light': 'from-purple-50 to-purple-100',
    'orange-light': 'from-orange-50 to-orange-100',
    'pink-light': 'from-pink-50 to-pink-100',
    'teal-light': 'from-teal-50 to-teal-100',
    'indigo-light': 'from-indigo-50 to-indigo-100',
    'amber-light': 'from-amber-50 to-amber-100',
    'emerald-light': 'from-emerald-50 to-emerald-100',
    'cyan-light': 'from-cyan-50 to-cyan-100',
    'rose-light': 'from-rose-50 to-rose-100',
    // Dark themes (first 7)
    'red-dark': 'from-red-900 to-red-950',
    'green-dark': 'from-green-900 to-green-950',
    'blue-dark': 'from-blue-900 to-blue-950',
    'purple-dark': 'from-purple-900 to-purple-950',
    'orange-dark': 'from-orange-900 to-orange-950',
    'pink-dark': 'from-pink-900 to-pink-950',
    'teal-dark': 'from-teal-900 to-teal-950',
    // Monochrome (8th dark theme)
    monochrome: 'from-gray-200 via-gray-300 to-gray-400',
  };

  return colorMap[themeValue] || 'from-gray-100 to-gray-200';
};

/**
 * Individual theme card component
 * The card itself displays the theme color as its background
 */
const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isActive, onClick }) => {
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }
  };

  const swatchGradient = getThemeSwatch(theme.value);

  return (
    <Card
      data-theme={theme.value}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Select ${theme.label} theme`}
      aria-pressed={isActive}
      className={cn(
        'group relative h-14 cursor-pointer overflow-hidden transition-all duration-200',
        'bg-gradient-to-br',
        swatchGradient,
        'hover:border-primary/50 hover:scale-[1.01] hover:shadow-md',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'active:scale-[0.99]',
        isActive &&
          'ring-primary border-primary scale-[1.01] shadow-md ring-2 ring-offset-0'
      )}
    >
      {/* Check icon overlay when active */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-primary rounded-full p-1 shadow-sm">
            <Check className="text-primary-foreground h-3 w-3" />
          </div>
        </div>
      )}
    </Card>
  );
};

type ThemeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Theme Dialog component that can be controlled externally
 * Used by both ThemeSwitcher and AccountSwitcher
 */
export const ThemeDialog: React.FC<ThemeDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<string | undefined>(
    undefined
  );
  const [originalTheme, setOriginalTheme] = React.useState<string | undefined>(
    undefined
  );

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Apply preview theme to root element
  React.useEffect(() => {
    if (previewTheme && isMounted) {
      document.documentElement.setAttribute('data-theme', previewTheme);
    }
  }, [previewTheme, isMounted]);

  // Initialize preview theme when dialog opens
  React.useEffect(() => {
    if (open && isMounted) {
      // Store original theme and set preview to current theme
      setOriginalTheme(theme);
      setPreviewTheme(theme);
    }
  }, [open, isMounted, theme]);

  // Revert to original theme when dialog closes without saving
  React.useEffect(() => {
    if (!open && isMounted && originalTheme) {
      // Revert to original theme if dialog is closed without saving
      // (only if preview theme differs from original)
      if (previewTheme && originalTheme !== previewTheme) {
        setTheme(originalTheme);
        document.documentElement.setAttribute('data-theme', originalTheme);
      }
      setPreviewTheme(undefined);
      setOriginalTheme(undefined);
    }
  }, [open, isMounted, originalTheme, previewTheme, setTheme]);

  const handleCardClick = (themeValue: string) => {
    setPreviewTheme(themeValue);
  };

  const handleSave = () => {
    if (previewTheme) {
      setTheme(previewTheme);
    }
    onOpenChange(false);
    setPreviewTheme(undefined);
    setOriginalTheme(undefined);
  };

  const handleCancel = () => {
    // Revert to original theme
    if (originalTheme) {
      setTheme(originalTheme);
      document.documentElement.setAttribute('data-theme', originalTheme);
    }
    onOpenChange(false);
    setPreviewTheme(undefined);
    setOriginalTheme(undefined);
  };

  if (!isMounted) {
    return null;
  }

  const activeTheme = previewTheme || theme;

  return (
    <DialogContent className="flex max-h-[70vh] w-[calc(100%-2rem)] max-w-6xl flex-col">
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold tracking-tight">
          Select Theme
        </DialogTitle>
        <DialogDescription>
          Preview themes by clicking on a card. Save your selection to apply the
          theme.
        </DialogDescription>
      </DialogHeader>
      <div className="-mr-1 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="pr-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {themes.map((themeOption) => (
              <ThemeCard
                key={themeOption.value}
                theme={themeOption}
                isActive={activeTheme === themeOption.value}
                onClick={() => handleCardClick(themeOption.value)}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save changes</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const ThemeSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          aria-label="Select theme"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DialogTrigger>
      <ThemeDialog open={isOpen} onOpenChange={setIsOpen} />
    </Dialog>
  );
};
