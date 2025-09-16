# XPortal UI Design System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Design System Architecture](#design-system-architecture)
3. [Color System](#color-system)
4. [Component Library](#component-library)
5. [Typography System](#typography-system)
6. [Spacing & Layout](#spacing--layout)
7. [Border Radius System](#border-radius-system)
8. [Shadow System](#shadow-system)
9. [State Management](#state-management)
10. [Accessibility](#accessibility)
11. [Dark Mode Implementation](#dark-mode-implementation)
12. [Component Variants](#component-variants)
13. [Best Practices](#best-practices)
14. [Implementation Guidelines](#implementation-guidelines)

## Overview

The XPortal Student Management System (SMS) utilizes a comprehensive UI design system built on top of **ShadCN/UI** with **Tailwind CSS** and **Radix UI** primitives. This design system provides a consistent, accessible, and themeable interface for managing Australian RTO (Registered Training Organisation) operations.

### Core Technologies
- **ShadCN/UI**: Component library and design system
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Class Variance Authority (CVA)**: Component variant management
- **Lucide React**: Icon library
- **Next.js**: React framework with App Router

### Design Philosophy
The design system follows these core principles:
- **Consistency**: Uniform visual language across all components
- **Accessibility**: WCAG 2.1 AA compliance built into every component
- **Scalability**: Modular architecture that grows with the application
- **Themeability**: Comprehensive light/dark mode support
- **Developer Experience**: Type-safe, well-documented components

## Design System Architecture

### Component Structure
The UI system is organized in a hierarchical structure:

```
components/
├── ui/                    # Core ShadCN/UI components
│   ├── button.tsx        # Button component with variants
│   ├── badge.tsx         # Badge component for status indicators
│   ├── card.tsx          # Card layout components
│   ├── table.tsx         # Data table components
│   ├── dropdown-menu.tsx # Context menu components
│   └── ...               # Additional UI components
├── providers/            # Context providers
│   ├── theme-provider.tsx
│   └── query-provider.tsx
└── app-sidebar.tsx       # Application-specific components
```

### Design Token System
The system uses CSS custom properties (CSS variables) for all design tokens, enabling dynamic theming and consistent values across components.

## Color System

### Color Palette Architecture
The color system is built on a semantic naming convention that describes the purpose of each color rather than its appearance:

#### Primary Colors
- **`--primary`**: Main brand color for primary actions and highlights
- **`--primary-foreground`**: Text color that contrasts with primary background
- **`--secondary`**: Secondary actions and subtle highlights
- **`--secondary-foreground`**: Text color for secondary elements

#### Semantic Colors
- **`--background`**: Main page background color
- **`--foreground`**: Primary text color
- **`--card`**: Card and panel background color
- **`--card-foreground`**: Text color for card content
- **`--popover`**: Dropdown and popover background
- **`--popover-foreground`**: Text color for popover content

#### Interactive Colors
- **`--muted`**: Subtle backgrounds and disabled states
- **`--muted-foreground`**: Muted text color for secondary information
- **`--accent`**: Hover states and subtle highlights
- **`--accent-foreground`**: Text color for accent elements

#### System Colors
- **`--destructive`**: Error states, delete actions, and warnings
- **`--border`**: Border color for all UI elements
- **`--input`**: Form input background and borders
- **`--ring`**: Focus ring color for accessibility

#### Chart Colors
- **`--chart-1`** through **`--chart-5`**: Data visualization colors
- **`--chart-1`**: Primary chart color (OKLCH: 0.646 0.222 41.116)
- **`--chart-2`**: Secondary chart color (OKLCH: 0.6 0.118 184.704)
- **`--chart-3`**: Tertiary chart color (OKLCH: 0.398 0.07 227.392)
- **`--chart-4`**: Quaternary chart color (OKLCH: 0.828 0.189 84.429)
- **`--chart-5`**: Quinary chart color (OKLCH: 0.769 0.188 70.08)

#### Sidebar Colors
- **`--sidebar`**: Sidebar background color
- **`--sidebar-foreground`**: Sidebar text color
- **`--sidebar-primary`**: Primary sidebar accent
- **`--sidebar-primary-foreground`**: Text color for sidebar primary elements
- **`--sidebar-accent`**: Sidebar hover states
- **`--sidebar-accent-foreground`**: Text color for sidebar accent elements
- **`--sidebar-border`**: Sidebar border color
- **`--sidebar-ring`**: Sidebar focus ring color

### Color Format: OKLCH
All colors are defined using the OKLCH color space, which provides:
- **Perceptual uniformity**: Equal steps in OKLCH correspond to equal perceived changes
- **Wide color gamut**: Support for modern displays and P3 color space
- **Future-proof**: Better support for emerging display technologies

### Light Mode Color Values
```css
:root {
  --background: oklch(1 0 0);                    /* Pure white */
  --foreground: oklch(0.145 0 0);                /* Near black */
  --card: oklch(1 0 0);                          /* Pure white */
  --card-foreground: oklch(0.145 0 0);           /* Near black */
  --popover: oklch(1 0 0);                       /* Pure white */
  --popover-foreground: oklch(0.145 0 0);        /* Near black */
  --primary: oklch(0.205 0 0);                   /* Dark gray */
  --primary-foreground: oklch(0.985 0 0);        /* Near white */
  --secondary: oklch(0.97 0 0);                  /* Light gray */
  --secondary-foreground: oklch(0.205 0 0);      /* Dark gray */
  --muted: oklch(0.97 0 0);                      /* Light gray */
  --muted-foreground: oklch(0.556 0 0);          /* Medium gray */
  --accent: oklch(0.97 0 0);                     /* Light gray */
  --accent-foreground: oklch(0.205 0 0);         /* Dark gray */
  --destructive: oklch(0.577 0.245 27.325);      /* Red */
  --border: oklch(0.922 0 0);                    /* Light border */
  --input: oklch(0.922 0 0);                     /* Input background */
  --ring: oklch(0.708 0 0);                      /* Focus ring */
}
```

### Dark Mode Color Values
```css
.dark {
  --background: oklch(0.145 0 0);                /* Near black */
  --foreground: oklch(0.985 0 0);                /* Near white */
  --card: oklch(0.205 0 0);                      /* Dark gray */
  --card-foreground: oklch(0.985 0 0);           /* Near white */
  --popover: oklch(0.269 0 0);                   /* Darker gray */
  --popover-foreground: oklch(0.985 0 0);        /* Near white */
  --primary: oklch(0.922 0 0);                   /* Light gray */
  --primary-foreground: oklch(0.205 0 0);        /* Dark gray */
  --secondary: oklch(0.269 0 0);                 /* Dark gray */
  --secondary-foreground: oklch(0.985 0 0);      /* Near white */
  --muted: oklch(0.269 0 0);                     /* Dark gray */
  --muted-foreground: oklch(0.708 0 0);          /* Medium gray */
  --accent: oklch(0.371 0 0);                    /* Accent gray */
  --accent-foreground: oklch(0.985 0 0);         /* Near white */
  --destructive: oklch(0.704 0.191 22.216);      /* Dark red */
  --border: oklch(1 0 0 / 10%);                  /* Subtle border */
  --input: oklch(1 0 0 / 15%);                   /* Input background */
  --ring: oklch(0.556 0 0);                      /* Focus ring */
}
```

## Component Library

### Button Component
The Button component is the foundation of interactive elements in the system.

#### Variants
- **`default`**: Primary action button with solid background
- **`destructive`**: Delete and dangerous actions with red styling
- **`outline`**: Secondary actions with border and transparent background
- **`secondary`**: Subtle actions with muted background
- **`ghost`**: Minimal actions with transparent background
- **`link`**: Text-based actions with underline on hover

#### Sizes
- **`default`**: Standard button height (h-9) with px-4 py-2 padding
- **`sm`**: Small button height (h-8) with px-3 py-1.5 padding
- **`lg`**: Large button height (h-10) with px-6 py-2 padding
- **`icon`**: Square button (size-9) for icon-only actions

#### Implementation
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Badge Component
The Badge component is used for status indicators, labels, and small pieces of information.

#### Variants
- **`default`**: Primary badge with solid background
- **`secondary`**: Secondary badge with muted background
- **`destructive`**: Error or warning badge with red styling
- **`outline`**: Border-only badge with transparent background

#### Implementation
```tsx
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

### Card Component
The Card component provides structured containers for content grouping.

#### Structure
- **`Card`**: Main container with background, border, and shadow
- **`CardHeader`**: Header section with title and optional actions
- **`CardTitle`**: Main heading within the card
- **`CardDescription`**: Subtitle or description text
- **`CardContent`**: Main content area with padding
- **`CardFooter`**: Footer section for actions or additional info
- **`CardAction`**: Action buttons in the header

#### Implementation
```tsx
// Main Card container
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

// Card content with proper padding
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}
```

### Table Component
The Table component provides structured data display with proper accessibility.

#### Structure
- **`Table`**: Main table container with responsive wrapper
- **`TableHeader`**: Table header with column definitions
- **`TableBody`**: Table body with data rows
- **`TableFooter`**: Table footer for summary information
- **`TableRow`**: Individual table row with hover states
- **`TableHead`**: Header cell with proper styling
- **`TableCell`**: Data cell with consistent padding
- **`TableCaption`**: Table caption for accessibility

#### Implementation
```tsx
// Table row with hover states and borders
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

// Table cell with proper alignment
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}
```

### Dropdown Menu Component
The Dropdown Menu component provides context menus and action lists.

#### Structure
- **`DropdownMenu`**: Root component using Radix UI primitives
- **`DropdownMenuTrigger`**: Button that opens the menu
- **`DropdownMenuContent`**: Menu container with animations
- **`DropdownMenuItem`**: Individual menu items with variants
- **`DropdownMenuSeparator`**: Visual separators between items
- **`DropdownMenuLabel`**: Section labels within menus

#### Variants
- **`default`**: Standard menu item styling
- **`destructive`**: Delete and dangerous actions with red styling

#### Implementation
```tsx
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}
```

## Typography System

### Font Stack
The typography system uses a carefully selected font stack:

```css
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
--font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

### Font Hierarchy
- **Primary Font**: Geist Sans (custom variable font)
- **Monospace Font**: Geist Mono (for code and technical content)
- **Fallback Fonts**: System fonts for maximum compatibility

### Text Sizes
The system uses Tailwind's text size scale:
- **`text-xs`**: 12px - Small labels and captions
- **`text-sm`**: 14px - Body text and form labels
- **`text-base`**: 16px - Default body text
- **`text-lg`**: 18px - Large body text
- **`text-xl`**: 20px - Small headings
- **`text-2xl`**: 24px - Medium headings
- **`text-3xl`**: 30px - Large headings

### Font Weights
- **`font-normal`**: 400 - Regular text
- **`font-medium`**: 500 - Emphasized text
- **`font-semibold`**: 600 - Headings and important text
- **`font-bold`**: 700 - Strong emphasis

## Spacing & Layout

### Spacing Scale
The system uses Tailwind's spacing scale based on 0.25rem (4px) increments:

- **`0`**: 0px
- **`0.5`**: 2px
- **`1`**: 4px
- **`1.5`**: 6px
- **`2`**: 8px
- **`2.5`**: 10px
- **`3`**: 12px
- **`3.5`**: 14px
- **`4`**: 16px
- **`5`**: 20px
- **`6`**: 24px
- **`8`**: 32px
- **`10`**: 40px
- **`12`**: 48px
- **`16`**: 64px
- **`20`**: 80px
- **`24`**: 96px

### Component Spacing
- **Button Padding**: `px-4 py-2` (default), `px-3 py-1.5` (sm), `px-6 py-2` (lg)
- **Card Padding**: `px-6` for content, `py-6` for vertical spacing
- **Table Cell Padding**: `p-2` for consistent cell spacing
- **Badge Padding**: `px-2 py-0.5` for compact labels

### Layout Patterns
- **Container**: `container mx-auto p-6` for page-level containers
- **Card Layout**: `flex flex-col gap-6` for vertical card layouts
- **Grid Layout**: `grid grid-cols-* gap-*` for responsive grids
- **Flex Layout**: `flex items-center gap-*` for horizontal layouts

## Border Radius System

### Radius Scale
The system uses a consistent border radius scale:

```css
--radius-sm: calc(var(--radius) - 2px);    /* 8px */
--radius-md: calc(var(--radius));          /* 10px */
--radius-lg: var(--radius);                /* 10px */
--radius-xl: calc(var(--radius) + 2px);    /* 12px */
```

### Base Radius
```css
--radius: 0.625rem; /* 10px */
```

### Component Usage
- **Buttons**: `rounded-md` (10px) for standard buttons
- **Cards**: `rounded-xl` (12px) for card containers
- **Badges**: `rounded-md` (10px) for status indicators
- **Tables**: `rounded-lg` (10px) for table containers
- **Dropdowns**: `rounded-md` (10px) for menu items

## Shadow System

### Shadow Scale
The system uses Tailwind's shadow scale:

- **`shadow-xs`**: Subtle shadow for buttons and small elements
- **`shadow-sm`**: Light shadow for cards and panels
- **`shadow-md`**: Medium shadow for dropdowns and modals
- **`shadow-lg`**: Large shadow for overlays and popups
- **`shadow-xl`**: Extra large shadow for emphasis

### Component Usage
- **Buttons**: `shadow-xs` for subtle elevation
- **Cards**: `shadow-sm` for gentle elevation
- **Dropdowns**: `shadow-md` for menu elevation
- **Modals**: `shadow-lg` for overlay emphasis

## State Management

### Interactive States
All interactive components support these states:

#### Default State
- **Background**: Component-specific background color
- **Text**: Appropriate foreground color
- **Border**: Component-specific border color

#### Hover State
- **Background**: Slightly darker or lighter background
- **Text**: Maintained or adjusted for contrast
- **Border**: May change for emphasis

#### Focus State
- **Ring**: `focus-visible:ring-ring/50` with 3px ring
- **Border**: `focus-visible:border-ring` for accessibility
- **Outline**: Hidden with `outline-hidden` for custom styling

#### Disabled State
- **Opacity**: `opacity-50` for visual indication
- **Pointer Events**: `pointer-events-none` to prevent interaction
- **Cursor**: Default cursor instead of pointer

#### Active State
- **Background**: Pressed state styling
- **Transform**: Optional scale or position changes

### Data States
Components support various data states:

#### Selected State
- **Background**: `data-[state=selected]:bg-muted`
- **Text**: Appropriate contrast color

#### Open State
- **Background**: `data-[state=open]:bg-accent`
- **Text**: `data-[state=open]:text-accent-foreground`

#### Checked State
- **Indicator**: Visual checkmark or radio indicator
- **Background**: May change to indicate selection

## Accessibility

### WCAG 2.1 AA Compliance
The design system is built with accessibility as a core principle:

#### Color Contrast
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio

#### Focus Management
- **Visible Focus**: All interactive elements have visible focus indicators
- **Focus Ring**: 3px ring with `ring-ring/50` opacity
- **Focus Order**: Logical tab order through all interactive elements

#### Keyboard Navigation
- **Tab Navigation**: All interactive elements are keyboard accessible
- **Arrow Keys**: Dropdown menus support arrow key navigation
- **Enter/Space**: Standard activation keys work consistently

#### Screen Reader Support
- **Semantic HTML**: Proper use of semantic elements
- **ARIA Labels**: Descriptive labels for complex components
- **Data Attributes**: `data-slot` attributes for component identification

#### Motion Preferences
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Animations**: Subtle transitions that don't cause motion sickness
- **Transitions**: `transition-all` for smooth state changes

### Implementation Examples
```tsx
// Focus-visible ring for accessibility
className="focus-visible:ring-ring/50 focus-visible:ring-[3px]"

// Disabled state with proper styling
className="disabled:pointer-events-none disabled:opacity-50"

// ARIA attributes for screen readers
data-slot="button"
aria-label="Delete application"
```

## Dark Mode Implementation

### Theme Toggle
The system supports dynamic theme switching between light and dark modes:

```tsx
// Theme provider implementation
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### CSS Custom Properties
All colors are defined as CSS custom properties that automatically switch between light and dark values:

```css
/* Light mode */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... other colors */
}

/* Dark mode */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... other colors */
}
```

### Component Adaptation
Components automatically adapt to theme changes:

```tsx
// Dark mode specific styling
className="dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"

// Conditional styling based on theme
className="dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
```

### Theme Persistence
User theme preferences are persisted across sessions using localStorage.

## Component Variants

### Variant System Architecture
The system uses Class Variance Authority (CVA) for type-safe component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const componentVariants = cva(
  "base-classes", // Base classes applied to all variants
  {
    variants: {
      variant: {
        default: "default-classes",
        secondary: "secondary-classes",
        destructive: "destructive-classes",
      },
      size: {
        sm: "small-classes",
        md: "medium-classes",
        lg: "large-classes",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
```

### Type Safety
All variants are fully typed with TypeScript:

```tsx
interface ComponentProps extends VariantProps<typeof componentVariants> {
  // Additional props
}

function Component({ variant, size, ...props }: ComponentProps) {
  return (
    <div className={cn(componentVariants({ variant, size }), props.className)} />
  )
}
```

### Variant Inheritance
Components can inherit variants from parent components or define their own:

```tsx
// Button variants
const buttonVariants = cva(/* ... */)

// Badge variants (inherits from button pattern)
const badgeVariants = cva(/* ... */)
```

## Best Practices

### Component Composition
- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Build complex components from simple ones
- **Props Interface**: Clear, well-documented prop interfaces
- **Default Values**: Sensible defaults for all optional props

### Styling Guidelines
- **Utility-First**: Use Tailwind utilities over custom CSS
- **Semantic Classes**: Use semantic color names over specific colors
- **Responsive Design**: Mobile-first approach with responsive utilities
- **Consistent Spacing**: Use the defined spacing scale consistently

### Performance Optimization
- **Tree Shaking**: Only import used components
- **CSS Purging**: Tailwind removes unused styles in production
- **Lazy Loading**: Load components only when needed
- **Memoization**: Use React.memo for expensive components

### Code Organization
- **File Structure**: Consistent file and folder organization
- **Naming Conventions**: Clear, descriptive component and prop names
- **Documentation**: Comprehensive JSDoc comments
- **Examples**: Usage examples in component files

## Implementation Guidelines

### Adding New Components
1. **Create Component File**: Place in `components/ui/` directory
2. **Define Variants**: Use CVA for variant management
3. **Add TypeScript Types**: Full type safety for props
4. **Implement Accessibility**: WCAG 2.1 AA compliance
5. **Add Documentation**: JSDoc comments and usage examples
6. **Test Responsiveness**: Ensure mobile-first design
7. **Test Dark Mode**: Verify theme switching works

### Customizing Existing Components
1. **Extend Variants**: Add new variants to existing components
2. **Maintain Backward Compatibility**: Don't break existing usage
3. **Update Types**: Ensure TypeScript types are updated
4. **Test All Variants**: Verify all variants work correctly
5. **Update Documentation**: Reflect changes in documentation

### Color Customization
1. **Use CSS Variables**: Always use semantic color names
2. **Update Both Themes**: Modify both light and dark mode values
3. **Test Contrast**: Ensure accessibility compliance
4. **Document Changes**: Update color documentation

### Component Usage
```tsx
// Correct usage with proper variants
<Button variant="destructive" size="sm">
  Delete
</Button>

// Badge with custom styling
<Badge variant="outline" className="bg-red-100 text-red-800">
  Error
</Badge>

// Card with proper structure
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Status Color Mapping
For application status indicators, use these specific color mappings:

```tsx
const statusConfig = {
  Draft: {
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  Submitted: {
    variant: 'outline' as const,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  },
  'Awaiting Payment': {
    variant: 'outline' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  },
  Accepted: {
    variant: 'outline' as const,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  Approved: {
    variant: 'outline' as const,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  Rejected: {
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
};
```

This comprehensive design system ensures consistency, accessibility, and maintainability across the entire XPortal Student Management System. All components follow the same patterns, use the same color tokens, and provide the same level of accessibility and user experience.
