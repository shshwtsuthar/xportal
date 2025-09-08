"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchForm } from "@/components/search-form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearApplicationWizardStorage } from "@/lib/utils";
import {
  Home,
  Users,
  GraduationCap,
  BookOpenText,
  CalendarDays,
  Building2,
  UserCog,
  BadgeDollarSign,
  FileText,
  ShieldCheck,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  Minus,
  GalleryVerticalEnd,
} from "lucide-react";

type NavItem = { title: string; href: string; icon?: React.ComponentType<{ className?: string }>; };

const dashboard: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: Home },
];

const students: NavItem[] = [
  { title: "Students", href: "/students", icon: Users },
  { title: "Applications", href: "/students/applications", icon: FileText },
  { title: "New Application", href: "/students/new", icon: GraduationCap },
];

const programs: NavItem[] = [
  { title: "Programs & Courses", href: "/programs", icon: BookOpenText },
];

const staff: NavItem[] = [
  { title: "Directory", href: "/staff", icon: UserCog },
];

const agents: NavItem[] = [
  { title: "Agents", href: "/agents", icon: Building2 },
];

const finance: NavItem[] = [
  { title: "Invoices", href: "/finance/invoices", icon: FileText },
  { title: "Payments", href: "/finance/payments", icon: BadgeDollarSign },
  { title: "Payment Plans", href: "/finance/payment-plans", icon: BadgeDollarSign },
  { title: "Commissions", href: "/finance/commissions", icon: BadgeDollarSign },
  { title: "Reports", href: "/finance/reports", icon: BarChart3 },
];

const compliance: NavItem[] = [
  { title: "AVETMISS", href: "/compliance/avetmiss", icon: ShieldCheck },
  { title: "CRICOS", href: "/compliance/cricos", icon: ShieldCheck },
  { title: "Audits", href: "/compliance/audits", icon: ShieldCheck },
];

const reports: NavItem[] = [
  { title: "Academic", href: "/reports/academic", icon: BarChart3 },
  { title: "Financial", href: "/reports/financial", icon: BarChart3 },
  { title: "Compliance", href: "/reports/compliance", icon: BarChart3 },
  { title: "Custom", href: "/reports/custom", icon: BarChart3 },
];

const settings: NavItem[] = [
  { title: "Organisation", href: "/settings/organisation", icon: Settings },
  { title: "Locations", href: "/settings/locations", icon: Building2 },
  { title: "Users", href: "/settings/users", icon: Users },
  { title: "Roles", href: "/settings/roles", icon: ShieldCheck },
  { title: "System", href: "/settings/system", icon: Settings },
];

const help: NavItem[] = [
  { title: "User Guide", href: "/help/user-guide", icon: HelpCircle },
  { title: "Compliance Guide", href: "/help/compliance-guide", icon: HelpCircle },
  { title: "Support", href: "/help/support", icon: HelpCircle },
];

function Group({ label, items, defaultOpen = false }: { label: string; items: NavItem[]; defaultOpen?: boolean }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              {label}
              <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
              <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {items.map((item) => (
                <SidebarMenuSubItem key={item.title}>
                  <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                    <Link href={item.href} aria-label={item.title} onClick={() => {
                      if (item.href === '/students/new') {
                        clearApplicationWizardStorage();
                      }
                    }}>
                      {item.title}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#" aria-label="XPortal SMS">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">XPortal SMS</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="scrollbar-none px-2 py-2 space-y-2">
        <SidebarGroup>
          <Group label="Dashboard" items={dashboard} defaultOpen />
          <Group label="Students" items={students} defaultOpen />
          <Group label="Programs" items={programs} />
          <Group label="Staff" items={staff} />
          <Group label="Agents" items={agents} />
          <Group label="Finance" items={finance} />
          <Group label="Compliance" items={compliance} />
          <Group label="Reports" items={reports} />
          <Group label="Settings" items={settings} />
          <Group label="Help" items={help} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter />
    </Sidebar>
  );
}


