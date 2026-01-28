'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  Check,
  Bell,
  LogOut,
  User,
  Palette,
} from 'lucide-react';
import { ProfileDialog } from '@/components/profile-dialog';
import { ThemeDialog } from '@/components/theme-switcher';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog } from '@/components/ui/dialog';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCurrentUser } from '@/src/hooks/useGetCurrentUser';
import { useProfileImageUrl } from '@/src/hooks/useProfileImage';
import { createClient } from '@/lib/supabase/client';

/**
 * Account Switcher component that displays the current user's information
 * and provides a dropdown menu with account-related actions.
 */
export function AccountSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: user, isLoading } = useGetCurrentUser();
  const { data: profileImageUrl } = useProfileImageUrl(
    user?.profile_image_path
  );
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [isThemeDialogOpen, setIsThemeDialogOpen] = React.useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(' ');
    }
    return user.email;
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-3 w-32" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar
                src={profileImageUrl ?? undefined}
                alt="Profile image"
                firstName={user.first_name ?? undefined}
                lastName={user.last_name ?? undefined}
                email={user.email}
                size="sm"
                variant="sidebar"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {getUserDisplayName()}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <div className="flex items-center gap-3 px-2 py-1.5">
              <UserAvatar
                src={profileImageUrl ?? undefined}
                alt="Profile image"
                firstName={user.first_name ?? undefined}
                lastName={user.last_name ?? undefined}
                email={user.email}
                size="sm"
                variant="sidebar"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {getUserDisplayName()}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <Check className="text-muted-foreground h-4 w-4" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/notifications">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsThemeDialogOpen(true)}>
              <Palette className="h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <ProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
        <ThemeDialog
          open={isThemeDialogOpen}
          onOpenChange={setIsThemeDialogOpen}
        />
      </Dialog>
    </SidebarMenu>
  );
}
