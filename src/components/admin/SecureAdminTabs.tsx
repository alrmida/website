
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import SecurityAwareUserManagement from './SecurityAwareUserManagement';
import MachineManagement from './MachineManagement';
import InvitationManagement from './InvitationManagement';
import InvitationCleanup from './InvitationCleanup';
import RawDataManagement from './RawDataManagement';
import { Profile, Invitation } from './types';

interface SecureAdminTabsProps {
  profiles: Profile[];
  machines: any[];
  invitations: Invitation[];
  profile: any;
  loading: boolean;
  machinesLoading: boolean;
  onRefresh: () => void;
  refetchMachines: () => void;
}

const SecureAdminTabs = ({ 
  profiles, 
  machines, 
  invitations, 
  profile, 
  loading, 
  machinesLoading, 
  onRefresh, 
  refetchMachines 
}: SecureAdminTabsProps) => {
  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Mode Active:</strong> Enhanced security measures are now in place. 
          All admin operations are audited and validated server-side.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="rawdata">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <SecurityAwareUserManagement 
            profiles={profiles} 
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <MachineManagement 
            machines={machines}
            profiles={profiles}
            profile={profile}
            loading={machinesLoading}
            onRefresh={refetchMachines}
          />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <InvitationManagement 
            invitations={invitations}
            profile={profile}
            loading={loading}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <InvitationCleanup />
        </TabsContent>

        <TabsContent value="rawdata" className="space-y-4">
          <RawDataManagement 
            onRefresh={onRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecureAdminTabs;
