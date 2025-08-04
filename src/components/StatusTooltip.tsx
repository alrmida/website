
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface StatusTooltipProps {
  status: string;
}

const StatusTooltip: React.FC<StatusTooltipProps> = ({ status }) => {
  const { t } = useLocalization();

  const getStatusDescription = (status: string): string => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'producing':
        return t('status.producing.description');
      case 'idle':
        return t('status.idle.description');
      case 'full water':
        return t('status.full.water.description');
      case 'disconnected':
        return t('status.disconnected.description');
      case 'defrosting':
        return t('status.defrosting.description');
      default:
        return status;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help ml-2" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{getStatusDescription(status)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StatusTooltip;
