'use client';

import * as React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const themes = [
  // Light Themes
  { value: 'red-light', label: 'Red Light' },
  { value: 'green-light', label: 'Green Light' },
  { value: 'blue-light', label: 'Blue Light' },
  { value: 'purple-light', label: 'Purple Light' },
  { value: 'orange-light', label: 'Orange Light' },
  { value: 'pink-light', label: 'Pink Light' },
  { value: 'teal-light', label: 'Teal Light' },
  { value: 'indigo-light', label: 'Indigo Light' },
  { value: 'amber-light', label: 'Amber Light' },
  { value: 'emerald-light', label: 'Emerald Light' },
  { value: 'cyan-light', label: 'Cyan Light' },
  { value: 'rose-light', label: 'Rose Light' },
  { value: 'violet-light', label: 'Violet Light' },
  { value: 'lime-light', label: 'Lime Light' },
  { value: 'sky-light', label: 'Sky Light' },
  { value: 'fuchsia-light', label: 'Fuchsia Light' },
  { value: 'slate-light', label: 'Slate Light' },
  { value: 'zinc-light', label: 'Zinc Light' },
  { value: 'neutral-light', label: 'Neutral Light' },
  { value: 'stone-light', label: 'Stone Light' },
  // Dark Themes
  { value: 'red-dark', label: 'Red Dark' },
  { value: 'green-dark', label: 'Green Dark' },
  { value: 'blue-dark', label: 'Blue Dark' },
  { value: 'purple-dark', label: 'Purple Dark' },
  { value: 'orange-dark', label: 'Orange Dark' },
  { value: 'pink-dark', label: 'Pink Dark' },
  { value: 'teal-dark', label: 'Teal Dark' },
  { value: 'indigo-dark', label: 'Indigo Dark' },
  { value: 'amber-dark', label: 'Amber Dark' },
  { value: 'emerald-dark', label: 'Emerald Dark' },
  { value: 'cyan-dark', label: 'Cyan Dark' },
  { value: 'rose-dark', label: 'Rose Dark' },
  { value: 'violet-dark', label: 'Violet Dark' },
  { value: 'lime-dark', label: 'Lime Dark' },
  { value: 'sky-dark', label: 'Sky Dark' },
  { value: 'fuchsia-dark', label: 'Fuchsia Dark' },
  { value: 'slate-dark', label: 'Slate Dark' },
  { value: 'zinc-dark', label: 'Zinc Dark' },
  { value: 'neutral-dark', label: 'Neutral Dark' },
  { value: 'stone-dark', label: 'Stone Dark' },
  // Special Themes
  { value: 'midnight', label: 'Midnight' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'desert', label: 'Desert' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'cosmic', label: 'Cosmic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'monochrome', label: 'Monochrome' },
];

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          aria-label="Select theme"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 w-48 overflow-y-auto"
      >
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="flex items-center justify-between"
          >
            <span>{themeOption.label}</span>
            {theme === themeOption.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
