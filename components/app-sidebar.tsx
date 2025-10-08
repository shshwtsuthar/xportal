'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GalleryVerticalEnd,
  Home,
  FilePlus2,
  ListTree,
  GraduationCap,
  Layers3,
  ReceiptText,
  LayoutTemplate,
  Users,
  BookOpen,
  UserCheck,
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
} from '@/components/ui/sidebar';

type NavItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
  items?: Array<{ title: string; url: string }>;
};

const NAV: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  {
    title: 'Applications',
    url: '/applications',
    icon: ListTree,
    items: [
      { title: 'All Applications', url: '/applications' },
      { title: 'New Application', url: '/applications/new' },
    ],
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: GraduationCap,
    items: [
      { title: 'All Programs', url: '/programs' },
      { title: 'New Program', url: '/programs/new' },
    ],
  },
  {
    title: 'Subjects',
    url: '/subjects',
    icon: BookOpen,
    items: [
      { title: 'All Subjects', url: '/subjects' },
      { title: 'New Subject', url: '/subjects/new' },
    ],
  },
  {
    title: 'Agents',
    url: '/agents',
    icon: UserCheck,
    items: [
      { title: 'All Agents', url: '/agents' },
      { title: 'New Agent', url: '/agents/new' },
    ],
  },
  {
    title: 'Program Plans',
    url: '/program-plans',
    icon: Layers3,
    items: [
      { title: 'All Program Plans', url: '/program-plans' },
      { title: 'New Program Plan', url: '/program-plans/new' },
    ],
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
  { title: 'Users', url: '/users', icon: Users },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

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
                    RTO Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
      <SidebarRail />
    </Sidebar>
  );
}
