
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const DashboardHeader = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💧</span>
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
                <Badge variant={profile.role === 'kumulus_personnel' ? 'default' : 'secondary'}>
                  {profile.role === 'kumulus_personnel' ? 'Kumulus' : 'Client'}
                </Badge>
              </div>
            )}
            <ThemeToggle />
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
