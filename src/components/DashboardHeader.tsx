
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalization } from '@/contexts/LocalizationContext';
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
import { useIsMobile } from '@/hooks/use-mobile';

const DashboardHeader = () => {
  const { profile, signOut, isImpersonating, impersonatedProfile, startImpersonation, stopImpersonation } = useAuth();
  const { t } = useLocalization();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const isMobile = useIsMobile();

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
    <header className="sticky top-0 z-50 bg-kumulus-dark-blue dark:bg-gray-900 shadow-lg border-b border-kumulus-blue/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-2">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            {/* Logo with theme-specific versions */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 md:space-x-4 min-w-0">
              {/* Light mode logo (white for dark header) */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <img 
                  src="/lovable-uploads/eeaac34d-4c12-4741-92cd-11685773ee0f.png" 
                  alt="Kumulus Logo" 
                  className="h-8 sm:h-10 block dark:hidden flex-shrink-0"
                />
                {/* Dark mode logo (white) */}
                <img 
                  src="/lovable-uploads/eeaac34d-4c12-4741-92cd-11685773ee0f.png" 
                  alt="Kumulus Logo" 
                  className="h-8 sm:h-10 hidden dark:block flex-shrink-0"
                />
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  KUMULUS
                </h1>
              </div>
              
              <div className="flex flex-col min-w-0">
                {/* Hide tagline on mobile, show abbreviated version on small screens */}
                <p className="text-xs text-kumulus-yellow hidden sm:block lg:block">
                  {isMobile ? t('header.tagline.mobile') : t('header.tagline')}
                </p>
              </div>
            </div>
            
            {/* Impersonation badge - more compact on mobile */}
            {isImpersonating && (
              <Badge variant="secondary" className="bg-kumulus-yellow text-kumulus-dark-blue border-kumulus-yellow text-xs ml-2 sm:ml-0">
                <Eye className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{t('header.impersonating')} </span>
                <span className="truncate max-w-20 sm:max-w-none">{impersonatedProfile?.username}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Admin panel button - hide text on mobile */}
            {profile?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdminPanelOpen(true)}
                className="flex items-center gap-1 sm:gap-2 border-kumulus-yellow text-kumulus-yellow hover:bg-kumulus-yellow hover:text-kumulus-dark-blue px-2 sm:px-3"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('header.admin.panel')}</span>
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-kumulus-blue">
                  <Avatar className="h-8 w-8 bg-kumulus-yellow">
                    <AvatarFallback className="bg-kumulus-yellow text-kumulus-dark-blue font-semibold text-sm">
                      {displayProfile ? getInitials(displayProfile.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none truncate">
                    {displayProfile?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Role: {displayProfile?.role}
                  </p>
                  {isImpersonating && (
                    <p className="text-xs leading-none text-kumulus-orange">
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
                        {t('header.stop.impersonation')}
                      </DropdownMenuItem>
                    ) : (
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('header.impersonating')}</span>
                        </div>
                        <Select onValueChange={handleImpersonation} disabled={profilesLoading}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allProfiles.map((userProfile) => (
                              <SelectItem key={userProfile.id} value={userProfile.id}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{userProfile.username}</span>
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
                  {t('header.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('header.signout')}
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
