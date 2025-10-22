'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GalleryVerticalEnd,
  Home,
  ListTree,
  ReceiptText,
  LayoutTemplate,
  Users,
  UserCheck,
  Building2,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useGetRto } from '@/src/hooks/useGetRto';
import { ThemeSwitcher } from '@/components/theme-switcher';

type NavItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
  items?: Array<{ title: string; url: string }>;
};

const NAV: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  {
    title: 'Students',
    url: '/students',
    icon: Users,
    items: [
      { title: 'Students', url: '/students' },
      { title: 'Attendance', url: '/attendance' },
    ],
  },
  {
    title: 'Applications',
    url: '/applications',
    icon: ListTree,
    items: [{ title: 'Applications', url: '/applications' }],
  },
  {
    title: 'Academic Planning',
    url: '/timetables',
    icon: LayoutTemplate,
    items: [
      { title: 'Timetables', url: '/timetables' },
      { title: 'Program Plans', url: '/program-plans' },
      { title: 'Programs', url: '/programs' },
      { title: 'Subjects', url: '/subjects' },
    ],
  },
  {
    title: 'Agents',
    url: '/agents',
    icon: UserCheck,
    items: [{ title: 'Agents', url: '/agents' }],
  },
  {
    title: 'Financial',
    url: '/financial',
    icon: ReceiptText,
    items: [
      { title: 'Invoices', url: '/financial/invoices' },
      { title: 'Payment Templates', url: '/financial/templates' },
      { title: 'New Template', url: '/financial/templates/new' },
    ],
  },
  {
    title: 'RTO',
    url: '/rto',
    icon: Building2,
    items: [{ title: 'Locations', url: '/locations' }],
  },
  { title: 'Users', url: '/users', icon: Users },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: rto } = useGetRto();

  const isActive = (href: string) => pathname === href;
  const isParentActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="XPortal">
              <Link href="/dashboard" aria-label="XPortal Home">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">XPortal</span>
                  <span className="text-muted-foreground text-xs">
                    {rto?.name || 'RTO Management'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((section) => {
              const Icon = section.icon;
              return (
                <SidebarMenuItem key={section.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isParentActive(section.url)}
                  >
                    <Link
                      href={section.url}
                      className="font-medium"
                      aria-label={section.title}
                    >
                      {Icon ? <Icon /> : null}
                      <span>{section.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {section.items?.length ? (
                    <SidebarMenuSub>
                      {section.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(sub.url)}
                          >
                            <Link href={sub.url} aria-label={sub.title}>
                              {sub.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
