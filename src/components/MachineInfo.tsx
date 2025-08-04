import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar, User, Cpu } from 'lucide-react';
import { MachineWithClient, getDisplayModelName, getOperatingSince } from '@/types/machine';
import AmphoreIcon from './icons/AmphoreIcon';
import BoKsIcon from './icons/BoKsIcon';
import WaterDispenserIcon from './icons/WaterDispenserIcon';

interface MachineInfoProps {
  machine: MachineWithClient;
  showOwner?: boolean;
}

// Model icon mapping - now using dedicated components for easy swapping
const getModelIcon = (modelName: string) => {
  switch (modelName.toLowerCase()) {
    case 'amphore':
      return <AmphoreIcon />;
    case 'boks':
      return <BoKsIcon />;
    case 'water dispenser':
      return <WaterDispenserIcon />;
    default:
      return <Cpu className="h-6 w-6 text-gray-500" />;
  }
};

const MachineInfo = ({ machine, showOwner = false }: MachineInfoProps) => {
  const modelName = getDisplayModelName(machine);
  const operatingSince = getOperatingSince(machine);

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {getModelIcon(modelName)}
          <div>
            <h3 className="text-xl font-semibold">{machine.name}</h3>
            <p className="text-sm text-gray-500 font-normal">{modelName}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Machine ID */}
          <div className="flex items-center gap-3">
            <Cpu className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Machine ID</p>
              <p className="font-mono text-sm">{machine.machine_id}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{machine.location || 'Not specified'}</p>
            </div>
          </div>

          {/* Owner - Show only for commercial users */}
          {showOwner && machine.client_profile?.username && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Owner</p>
                <p className="font-medium">{machine.client_profile.username}</p>
              </div>
            </div>
          )}

          {/* Operating Since */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Operating Since</p>
              <p className="font-medium">{operatingSince}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineInfo;
