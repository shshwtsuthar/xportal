'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Check, Bell, LogOut, User } from 'lucide-react';
import { ProfileDialog } from '@/components/profile-dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const { data: profileImageUrl, isLoading: isLoadingImage } =
    useProfileImageUrl(user?.profile_image_path);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.first_name?.[0]?.toUpperCase() || '';
    const last = user.last_name?.[0]?.toUpperCase() || '';
    return first + last || user.email[0]?.toUpperCase() || 'U';
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
              <Avatar className="border-border size-8 rounded-lg border">
                {profileImageUrl ? (
                  <AvatarImage src={profileImageUrl} alt="Profile image" />
                ) : null}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
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
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <div className="p-2">
              <div className="flex items-center gap-2 rounded-md p-2">
                <Avatar className="size-8 rounded-lg border">
                  {profileImageUrl ? (
                    <AvatarImage src={profileImageUrl} alt="Profile image" />
                  ) : null}
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
                <Check className="text-muted-foreground size-4" />
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Profile
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer gap-2 p-2"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              <div className="flex size-6 items-center justify-center rounded-md border">
                <User className="size-3.5 shrink-0" />
              </div>
              <div className="font-medium">Profile</div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <a href="/notifications" className="cursor-pointer">
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Bell className="size-3.5 shrink-0" />
                </div>
                <div className="font-medium">Notifications</div>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2 p-2"
              onClick={handleLogout}
            >
              <div className="flex size-6 items-center justify-center rounded-md border">
                <LogOut className="size-3.5 shrink-0" />
              </div>
              <div className="font-medium">Log out</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <ProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </SidebarMenu>
  );
}
