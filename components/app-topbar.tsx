'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

type Crumb = { label: string; href?: string };

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  applications: 'Applications',
  new: 'New',
  edit: 'Edit',
  programs: 'Programs',
  'program-plans': 'Program Plans',
  financial: 'Financial',
  invoices: 'Invoices',
  templates: 'Templates',
  users: 'Users',
};

const generateBreadcrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0)
    return [{ label: 'Dashboard', href: '/dashboard' }];

  const crumbs: Crumb[] = [];
  let hrefAcc = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    hrefAcc += `/${seg}`;

    // If the path looks like edit/[id], prefer "Edit" and skip the id label
    if (seg === 'edit' && i + 1 < segments.length) {
      crumbs.push({
        label: SEGMENT_LABELS[segments[i - 1]] ?? 'Edit',
        href: hrefAcc,
      });
      // The id segment will be the last; display as page (no link)
      crumbs.push({ label: 'Details' });
      break;
    }

    // Name each segment if known
    const label =
      SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: hrefAcc });
  }

  // Make only the last crumb non-link
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  }

  return crumbs;
};

export const AppTopbar: React.FC = () => {
  const pathname = usePathname();
  const crumbs = React.useMemo(
    () => generateBreadcrumbs(pathname || '/dashboard'),
    [pathname]
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-3">
        <SidebarTrigger aria-label="Toggle sidebar" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, idx) => {
              const isLast = idx === crumbs.length - 1;
              return (
                <React.Fragment key={`${c.label}-${idx}`}>
                  <BreadcrumbItem
                    className={idx === 0 ? 'hidden md:block' : undefined}
                  >
                    {isLast || !c.href ? (
                      <BreadcrumbPage>{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbSeparator
                      className={idx === 0 ? 'hidden md:block' : undefined}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};
