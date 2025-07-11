
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Shield, Eye, EyeOff, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SettingsModal from './SettingsModal';
import AdminPanel from './AdminPanel';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Profile } from './admin/types';
import { mapDatabaseRoleToFrontend } from './admin/utils';

const DashboardHeader = () => {
  const { profile, signOut, isImpersonating, impersonatedProfile, startImpersonation, stopImpersonation } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles();
    }
  }, [profile]);

  const fetchAllProfiles = async () => {
    setProfilesLoading(true);
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (profilesData) {
        const mappedProfiles = profilesData.map(p => ({
          ...p,
          role: mapDatabaseRoleToFrontend(p.role)
        }));
        setAllProfiles(mappedProfiles);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
    setProfilesLoading(false);
  };

  const handleImpersonation = (userId: string) => {
    const targetProfile = allProfiles.find(p => p.id === userId);
    if (targetProfile) {
      startImpersonation(targetProfile);
    }
  };

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
            {/* Logo with theme-specific versions */}
            <div className="flex items-center space-x-3">
              {/* Light mode logo (blue) */}
              <img 
                src="/lovable-uploads/9303e210-3810-462b-8736-e32b9e824785.png" 
                alt="Kumulus Logo" 
                className="h-10 block dark:hidden"
              />
              {/* Dark mode logo (white) */}
              <img 
                src="/lovable-uploads/eeaac34d-4c12-4741-92cd-11685773ee0f.png" 
                alt="Kumulus Logo" 
                className="h-10 hidden dark:block"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  KUMULUS
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your Drinking Water From Air. Mineralized, Fresh, Sustainable
                </p>
              </div>
            </div>
            {isImpersonating && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                <Eye className="h-3 w-3 mr-1" />
                Viewing as {impersonatedProfile?.username}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Only true admins should see the admin panel button */}
            {profile?.role === 'admin' && (
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

            {/* Quick logout button for easier access */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            
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
              <DropdownMenuContent className="w-72" align="end" forceMount>
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
                
                {/* Admin Impersonation Controls */}
                {profile?.role === 'admin' && (
                  <>
                    {isImpersonating ? (
                      <DropdownMenuItem onClick={stopImpersonation}>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Stop Impersonation
                      </DropdownMenuItem>
                    ) : (
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm font-medium">View as User</span>
                        </div>
                        <Select onValueChange={handleImpersonation} disabled={profilesLoading}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allProfiles.map((userProfile) => (
                              <SelectItem key={userProfile.id} value={userProfile.id}>
                                <div className="flex items-center gap-2">
                                  <span>{userProfile.username}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {userProfile.role}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
