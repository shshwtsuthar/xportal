# Geist-Inspired Strict Design System

## Table of Contents
- Introduction
- Architecture & Enforcement
- Design Tokens: Colors, Spacing, Typography
- Strict Component System
- Layout & Spacing Rules
- State, Accessibility, and Compliance
- Governance and Developer Tooling
- Component Documentation Standards

---

## Introduction

This design system is inspired by Vercel, Geist, and v0.dev. Its primary objective is to guarantee **pixel-perfect consistency and compliance**, regardless of which developer implements the UI. The system is highly opinionated, type-safe, and automation-friendly.

**Stack:** ShadCN/UI, Next.js (App Router), Radix UI, Tailwind CSS, CVA, Supabase

---

## Architecture & Enforcement

### Folder Structure Strictness

```
components/
├─ ui/                  # Only Geist-patterned ShadCN/UI components allowed
├─ tokens/              # System design tokens (do not modify except via proposal)
├─ providers/           # App context/config providers
└─ app-*/               # Application-specific composites only
```

### Governance & Approval Workflow
- **All component changes, new tokens, or token edits** must be PR-reviewed against compliance checklists (see 'Governance').
- No adhoc or inline styles allowed (enforced by ESLint/prettier rules).

---
## Design Tokens

### Colors

**Never use hardcoded or ad-hoc color values. Only use tokens.**

```css
:root {
  /* Brand tokens */
  --color-brand-primary: oklch(0.646 0.222 41.116);
  --color-brand-secondary: oklch(0.6 0.118 184.704);

  /* Semantic tokens */
  --color-background: var(--color-brand-primary);
  --color-foreground: oklch(0.985 0 0);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.145 0 0);
  --color-accent: oklch(0.828 0.189 84.429);
  --color-accent-foreground: oklch(0.205 0 0);
  --color-destructive: oklch(0.577 0.245 27.325);
  --color-border: oklch(0.922 0 0);
  --color-ring: oklch(0.708 0 0);
  /* ...all other semantic color tokens (see original list)... */
}

/* Dark mode overrides */
.dark {
  --color-background: oklch(0.145 0 0);
  --color-foreground: oklch(0.985 0 0);
  /* ... overrides for each semantic token ... */
}
```

**Rule:** Only CSS variables from `/tokens/colors.css` are used in every component, utility, and global style.

---
### Spacing

**Strict 8px grid. No custom margins/paddings allowed.**

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```
All spacing tokens are managed in `/tokens/spacing.css`. ESLint prohibits usage of any spacing not defined above.

---
### Typography

```css
:root {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
```
Type scales:
- `text-xs` (12px)
- `text-sm` (14px)
- `text-base` (16px)
- `text-lg` (18px)
- ... (as per Tailwind scale)

Only font and weights declared in `/tokens/typography.css` can be used.

---
## Strict Component System

### General Rules
- All UI components extend from one of the Geist/Vercel patterns.
- Class Variance Authority (CVA) *must* be used for style variants. Overriding `className` is strictly forbidden unless for design-system updates.
- Every public prop is type-safe; variant & size props are exhaustive enums.

### Example: Button

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  variant?: 'primary' | 'secondary' | 'destructive',
  size?: 'sm' | 'md' | 'lg'
  className?: never // No overrides allowed
}
```

**All other components (Badge, Card, Dropdown, etc)** follow this enforced variant pattern, from their own tokenized files and exhaustive types.

---
## Layout & Spacing Rules

- All vertical and horizontal spacing is tokenized via `gap-*` or `px-*`, `py-*`, `m-*`, `p-*` using approved tokens only
- Example:

```tsx
<Card className="gap-6 px-space-6 py-space-6" />
<Button className="py-space-2 px-space-4" />
```
- No non-tokenized value in any margin, padding, or layout property

---
## State, Accessibility, and Compliance

- All colors, focus rings, borders use tokens only
- All UI compositions auto-compute states for default/hover/focus/disabled/active (never rely on manual color tweaks)
- All interactive elements are keyboard-accessible and screenreader-friendly, with aria-labels and visible focus rings
- All new color/contrast changes require automated WCAG test pass (in CI)

## Governance and Developer Tooling

- All tokens live in `/tokens/` and updated by PR; changes require type and visual snapshot tests
- ESLint/Prettier config:
  - No arbitrary colors/spacing/typography/box-shadow allowed
  - Only use tokens (auto-fix and error on violation)
  - No from-scratch className additions
- Components in `/ui/` auto-tested with Storybook controls (no custom controls)
- CLI tools for design token lint, migration, validation

---
## Component Documentation Standards

- All components carry extensive JSDoc and usage examples
- Status, accessibility, and compliance labels (e.g., `@stable`, `@version`, `@accessibility`)
- Every variant and size combination documented and exported
- Each usage example explicitly references token names
- Component selection documented with flow-chart/decision-trees in docs

---

## Conclusion

Developers must strictly conform to all design tokens, composition rules, and governance policies. No customizations are permitted outside the guidelines. Review and automation ensure your app **always** looks like Vercel, Geist, and v0.dev.
