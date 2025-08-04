
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, User, Cpu } from 'lucide-react';
import { MachineWithClient, getDisplayModelName, getOperatingSince } from '@/types/machine';
import { useLocalization } from '@/contexts/LocalizationContext';
import AmphoreIcon from './icons/AmphoreIcon';
import BoKsIcon from './icons/BoKsIcon';
import WaterDispenserIcon from './icons/WaterDispenserIcon';
import { useIsMobile } from '@/hooks/use-mobile';

interface MachineInfoProps {
  machine: MachineWithClient;
  showOwner?: boolean;
}

// Model icon mapping - responsive sizing
const getModelIcon = (modelName: string, isMobile: boolean) => {
  const iconClass = isMobile ? "h-12 w-12" : "h-16 w-16"; // Smaller on mobile
  
  switch (modelName.toLowerCase()) {
    case 'amphore':
      return <AmphoreIcon className={iconClass} />;
    case 'boks':
      return <BoKsIcon className={iconClass} />;
    case 'water dispenser':
      return <WaterDispenserIcon className={iconClass} />;
    default:
      return <Cpu className={`${iconClass} text-gray-500`} />;
  }
};

const MachineInfo = ({ machine, showOwner = false }: MachineInfoProps) => {
  const { t } = useLocalization();
  const modelName = getDisplayModelName(machine);
  const operatingSince = getOperatingSince(machine);
  const isMobile = useIsMobile();

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        {/* Responsive layout - vertical on mobile, horizontal on larger screens */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          {/* Top Section - Icon + Identity (full width on mobile) */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {getModelIcon(modelName, isMobile)}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {machine.name}
              </h3>
              <p className="text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-300">
                {modelName}
              </p>
            </div>
          </div>

          {/* Info Cards Section - single column on mobile, grid on larger screens */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Machine ID */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('machine.id')}
                </span>
              </div>
              <p className="font-mono text-sm font-medium text-gray-900 dark:text-white break-all">
                {machine.machine_id}
              </p>
            </div>

            {/* Location */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('machine.location')}
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white break-words">
                {machine.location || t('machine.not.specified')}
              </p>
            </div>

            {/* Operating Since */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('machine.operating.since')}
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {operatingSince}
              </p>
            </div>

            {/* Client Owner - Always show when available */}
            {machine.client_profile?.username && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-0 overflow-hidden sm:col-span-1 lg:col-span-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {t('machine.client.owner')}
                  </span>
                </div>
                <p className="font-medium text-blue-900 dark:text-blue-100 break-words">
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
