
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import SettingsModal from './SettingsModal';
import AdminPanel from './AdminPanel';

const DashboardHeader = () => {
  const { profile, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'commercial': return 'default';
      case 'client': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'commercial': return 'Commercial';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <img 
                src="/kumulus-logo-white.png" 
                alt="Kumulus" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback to text if image doesn't load
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
              <span className="text-white text-lg font-bold hidden">K</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kumulus - AWG Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Powered by EeKan • Clean water from air • Real-time Monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {profile && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {profile.username}
                </span>
                <Badge variant={getRoleBadgeVariant(profile.role)}>
                  {getRoleLabel(profile.role)}
                </Badge>
              </div>
            )}
            <ThemeToggle />
            {(profile?.role === 'admin' || profile?.role === 'commercial') && (
              <Button variant="outline" size="sm" onClick={() => setAdminOpen(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      {(profile?.role === 'admin' || profile?.role === 'commercial') && (
        <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />
      )}
    </div>
  );
};

export default DashboardHeader;
