
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, User, Users } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  role: 'client' | 'commercial' | 'admin';
}

const mapDatabaseRoleToFrontend = (dbRole: string): 'client' | 'commercial' | 'admin' => {
  switch (dbRole) {
    case 'kumulus_personnel':
      return 'commercial';
    case 'kumulus_admin':
      return 'admin';
    case 'client':
      return 'client';
    default:
      return 'client';
  }
};

const AdminImpersonationPanel = () => {
  const { profile, isImpersonating, impersonatedProfile, startImpersonation, stopImpersonation } = useAuth();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles();
    }
  }, [profile]);

  const fetchAllProfiles = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const handleImpersonation = (userId: string) => {
    const targetProfile = allProfiles.find(p => p.id === userId);
    if (targetProfile) {
      startImpersonation(targetProfile);
    }
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <Users className="h-5 w-5" />
          Admin View Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isImpersonating ? (
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-medium text-amber-800 dark:text-amber-200">
                  Currently viewing as: <strong>{impersonatedProfile?.username}</strong>
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Role: <Badge variant="secondary" className="ml-1">{impersonatedProfile?.role}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={stopImpersonation} variant="outline" size="sm" className="border-amber-300">
              <EyeOff className="h-4 w-4 mr-2" />
              Stop Viewing As User
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>Select a user to view the application from their perspective:</span>
            </div>
            <Select onValueChange={handleImpersonation} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a user to view as..." />
              </SelectTrigger>
              <SelectContent>
                {allProfiles.map((userProfile) => (
                  <SelectItem key={userProfile.id} value={userProfile.id}>
                    <div className="flex items-center gap-3 py-1">
                      <span className="font-medium">{userProfile.username}</span>
                      <Badge 
                        variant={userProfile.role === 'admin' ? 'default' : 
                                userProfile.role === 'commercial' ? 'secondary' : 
                                'outline'} 
                        className="text-xs"
                      >
                        {userProfile.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              💡 When viewing as another user, you'll see exactly what they see, including their machine access and data visibility.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminImpersonationPanel;
