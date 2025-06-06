
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Shield, Eye } from 'lucide-react';
import SettingsModal from './SettingsModal';
import AdminPanel from './AdminPanel';
import ImpersonationControls from './admin/ImpersonationControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const DashboardHeader = () => {
  const { profile, signOut, isImpersonating, impersonatedProfile, stopImpersonation } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayProfile = isImpersonating ? impersonatedProfile : profile;

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kumulus AWG Dashboard
            </h1>
            {isImpersonating && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                <Eye className="h-3 w-3 mr-1" />
                Viewing as {impersonatedProfile?.username}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {(profile?.role === 'admin' || profile?.role === 'commercial') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdminPanelOpen(true)}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {displayProfile ? getInitials(displayProfile.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {displayProfile?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Role: {displayProfile?.role}
                  </p>
                  {isImpersonating && (
                    <p className="text-xs leading-none text-amber-600">
                      (Impersonating)
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                {isImpersonating && (
                  <>
                    <DropdownMenuItem onClick={stopImpersonation}>
                      <Eye className="mr-2 h-4 w-4" />
                      Stop Impersonation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AdminPanel open={adminPanelOpen} onOpenChange={setAdminPanelOpen} />
    </header>
  );
};

export default DashboardHeader;
