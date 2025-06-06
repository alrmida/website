
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, User } from 'lucide-react';
import { Profile } from './types';
import { mapDatabaseRoleToFrontend } from './utils';

const ImpersonationControls = () => {
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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Admin Impersonation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isImpersonating ? (
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-medium">Currently viewing as: {impersonatedProfile?.username}</div>
                <div className="text-sm text-gray-600">
                  Role: <Badge variant="secondary">{impersonatedProfile?.role}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={stopImpersonation} variant="outline" size="sm">
              <EyeOff className="h-4 w-4 mr-2" />
              Stop Impersonation
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Select a user to view the application from their perspective:
            </div>
            <Select onValueChange={handleImpersonation} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user to impersonate..." />
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
      </CardContent>
    </Card>
  );
};

export default ImpersonationControls;
