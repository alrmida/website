
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Shield, AlertTriangle } from 'lucide-react';

const InvitationCleanup = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    expired: number;
    unused: number;
  } | null>(null);

  const fetchInvitationStats = async () => {
    try {
      const { data: allInvitations, error } = await supabase
        .from('invitations')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const expired = allInvitations?.filter(inv => new Date(inv.expires_at) < now).length || 0;
      const unused = allInvitations?.filter(inv => !inv.used_at).length || 0;

      setStats({
        total: allInvitations?.length || 0,
        expired,
        unused
      });
    } catch (error: any) {
      console.error('Error fetching invitation stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invitation statistics',
        variant: 'destructive',
      });
    }
  };

  const cleanupExpiredInvitations = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Expired invitations have been cleaned up',
      });

      fetchInvitationStats();
    } catch (error: any) {
      console.error('Error cleaning up invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to cleanup expired invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInvitationStats();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Invitation Security Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Regular cleanup of expired invitations helps maintain security by removing unused access tokens.
          </AlertDescription>
        </Alert>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Invitations</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.unused}</div>
              <div className="text-sm text-gray-600">Unused</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={cleanupExpiredInvitations}
            disabled={loading || !stats?.expired}
            variant="outline"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'Cleaning...' : 'Cleanup Expired'}
          </Button>
          <Button
            onClick={fetchInvitationStats}
            variant="outline"
          >
            Refresh Stats
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvitationCleanup;
