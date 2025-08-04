
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, User, Cpu } from 'lucide-react';
import { MachineWithClient, getDisplayModelName, getOperatingSince } from '@/types/machine';
import AmphoreIcon from './icons/AmphoreIcon';
import BoKsIcon from './icons/BoKsIcon';
import WaterDispenserIcon from './icons/WaterDispenserIcon';

interface MachineInfoProps {
  machine: MachineWithClient;
  showOwner?: boolean;
}

// Model icon mapping - now with larger icons
const getModelIcon = (modelName: string) => {
  const iconClass = "h-16 w-16"; // Much larger icons
  
  switch (modelName.toLowerCase()) {
    case 'amphore':
      return <AmphoreIcon className={iconClass} />;
    case 'boks':
      return <BoKsIcon className={iconClass} />;
    case 'water dispenser':
      return <WaterDispenserIcon className={iconClass} />;
    default:
      return <Cpu className="h-16 w-16 text-gray-500" />;
  }
};

const MachineInfo = ({ machine, showOwner = false }: MachineInfoProps) => {
  const modelName = getDisplayModelName(machine);
  const operatingSince = getOperatingSince(machine);

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Section - Large Icon + Name */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            {getModelIcon(modelName)}
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{machine.name}</h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{modelName}</p>
            </div>
          </div>

          {/* Middle Section - Machine Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Machine ID</span>
                <p className="font-mono text-sm text-gray-900 dark:text-white truncate">{machine.machine_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                <p className="font-medium text-gray-900 dark:text-white truncate">{machine.location || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Right Section - Additional Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Operating Since</span>
                <p className="font-medium text-gray-900 dark:text-white">{operatingSince}</p>
              </div>
            </div>

            {/* Owner - Show only for commercial users */}
            {showOwner && machine.client_profile?.username && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Owner</span>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{machine.client_profile.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineInfo;
