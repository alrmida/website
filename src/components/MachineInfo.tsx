
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

// Model icon mapping - compact size for better space utilization
const getModelIcon = (modelName: string) => {
  const iconClass = "h-16 w-16"; // Smaller than before but still prominent
  
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
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardContent className="p-6">
        {/* Main horizontal layout - more compact */}
        <div className="flex items-center gap-8">
          {/* Left Section - Icon + Identity (minimal width) */}
          <div className="flex items-center gap-4 min-w-0">
            {getModelIcon(modelName)}
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {machine.name}
              </h3>
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
                {modelName}
              </p>
            </div>
          </div>

          {/* Right Section - Compact Info Cards */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Machine ID */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Machine ID
                </span>
              </div>
              <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
                {machine.machine_id}
              </p>
            </div>

            {/* Location */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Location
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {machine.location || 'Not specified'}
              </p>
            </div>

            {/* Operating Since */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Operating Since
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {operatingSince}
              </p>
            </div>

            {/* Client Owner - Always show when available */}
            {machine.client_profile?.username && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Client Owner
                  </span>
                </div>
                <p className="font-medium text-blue-900 dark:text-blue-100 truncate">
                  {machine.client_profile.username}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MachineInfo;
