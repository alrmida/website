
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

// Model icon mapping - extra large icons for prominence
const getModelIcon = (modelName: string) => {
  const iconClass = "h-24 w-24"; // Extra large icons
  
  switch (modelName.toLowerCase()) {
    case 'amphore':
      return <AmphoreIcon className={iconClass} />;
    case 'boks':
      return <BoKsIcon className={iconClass} />;
    case 'water dispenser':
      return <WaterDispenserIcon className={iconClass} />;
    default:
      return <Cpu className="h-24 w-24 text-gray-500" />;
  }
};

const MachineInfo = ({ machine, showOwner = false }: MachineInfoProps) => {
  const modelName = getDisplayModelName(machine);
  const operatingSince = getOperatingSince(machine);

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Left Section - Large Icon + Machine Identity (40% width on large screens) */}
          <div className="lg:col-span-2 flex flex-col items-center lg:items-start space-y-4">
            <div className="flex flex-col items-center lg:items-start space-y-4">
              {getModelIcon(modelName)}
              <div className="text-center lg:text-left space-y-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {machine.name}
                </h3>
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {modelName}
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Machine Details Grid (60% width on large screens) */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Machine ID */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <Cpu className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                  Machine ID
                </span>
                <p className="font-mono text-sm font-medium text-gray-900 dark:text-white break-all">
                  {machine.machine_id}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                  Location
                </span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {machine.location || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Operating Since */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                  Operating Since
                </span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {operatingSince}
                </p>
              </div>
            </div>

            {/* Owner - Show only for commercial users */}
            {showOwner && machine.client_profile?.username && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Owner
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {machine.client_profile.username}
                  </p>
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
