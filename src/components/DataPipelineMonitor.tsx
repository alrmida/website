
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Database, Wifi, Filter } from 'lucide-react';
import useLiveMachineData from '@/hooks/useLiveMachineData';
import { MachineWithClient } from '@/types/machine';
import { DATA_CONFIG } from '@/config/dataConfig';

interface DataPipelineMonitorProps {
  selectedMachine: MachineWithClient | null;
}

const DataPipelineMonitor = ({ selectedMachine }: DataPipelineMonitorProps) => {
  const { data: liveData, isLoading, error } = useLiveMachineData(selectedMachine);

  const getPhaseStatus = () => {
    if (!selectedMachine) {
      return { phase: 'No Machine Selected', status: 'waiting', color: 'gray' };
    }

    if (isLoading) {
      return { phase: 'Phase 1: Loading Telemetry Data', status: 'loading', color: 'yellow' };
    }

    if (error) {
      return { phase: 'Phase 1: Database Error', status: 'error', color: 'red' };
    }

    if (liveData.dataSource === 'live' && liveData.waterLevel > 0) {
      return { phase: 'Phase 1: Telemetry Data Retrieved ✅', status: 'success', color: 'green' };
    }

    if (liveData.dataSource === 'live' && liveData.waterLevel === 0) {
      return { phase: 'Phase 1: Telemetry Data (Zero Level)', status: 'partial', color: 'orange' };
    }

    return { phase: 'Phase 1: No Telemetry Data Found', status: 'no-data', color: 'red' };
  };

  const phaseStatus = getPhaseStatus();

  const getStatusIcon = () => {
    switch (phaseStatus.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'error':
      case 'no-data':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDataAge = (ageMs: number) => {
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  };

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Enhanced Telemetry Monitor ({DATA_CONFIG.LIVE_DATA_POLL_INTERVAL_MS / 1000}s polling, {DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000}s disconnect)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{phaseStatus.phase}</span>
          </div>
          <Badge variant={phaseStatus.color === 'green' ? 'default' : 'secondary'}>
            {phaseStatus.status}
          </Badge>
        </div>

        {/* Machine Details */}
        {selectedMachine && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Machine ID:</span>
              <span className="font-mono">{selectedMachine.machine_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Data Filter:</span>
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600 font-medium">Telemetry Only</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Polling Frequency:</span>
              <span className="text-green-600 font-medium">{DATA_CONFIG.LIVE_DATA_POLL_INTERVAL_MS / 1000} seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Disconnect Threshold:</span>
              <span className="text-orange-600 font-medium">{DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000} seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Data Source:</span>
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>{liveData.dataSource === 'live' ? 'Direct Supabase' : 'Fallback'}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Water Level:</span>
              <span className={`font-medium ${liveData.waterLevel > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                {liveData.waterLevel.toFixed(2)} L
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Last Telemetry:</span>
              <span className="text-xs">{formatDataAge(liveData.dataAge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <div className="flex items-center gap-1">
                {liveData.isOnline ? (
                  <Wifi className="h-3 w-3 text-green-600" />
                ) : (
                  <Wifi className="h-3 w-3 text-red-600" />
                )}
                <span>{liveData.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Enhanced Phase 1 Validation */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <strong>Enhanced Telemetry Validation:</strong>
          <ul className="mt-1 space-y-1">
            <li className={`flex items-center gap-1 ${!selectedMachine ? 'text-gray-500' : 'text-green-600'}`}>
              {selectedMachine ? '✅' : '⏳'} Machine selected
            </li>
            <li className={`flex items-center gap-1 ${liveData.dataSource !== 'live' ? 'text-gray-500' : 'text-green-600'}`}>
              {liveData.dataSource === 'live' ? '✅' : '⏳'} {DATA_CONFIG.LIVE_DATA_POLL_INTERVAL_MS / 1000}-second telemetry polling
            </li>
            <li className="flex items-center gap-1 text-blue-600">
              🔍 Sync data filtered out (telemetry only)
            </li>
            <li className={`flex items-center gap-1 ${liveData.waterLevel <= 0 ? 'text-orange-500' : 'text-green-600'}`}>
              {liveData.waterLevel > 0 ? '✅' : '⚠️'} Real telemetry water level ({liveData.waterLevel > 0 ? 'SUCCESS' : 'needs investigation'})
            </li>
            <li className={`flex items-center gap-1 ${liveData.dataAge > DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS ? 'text-red-500' : 'text-green-600'}`}>
              {liveData.dataAge <= DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS ? '✅' : '❌'} Telemetry freshness (less than {DATA_CONFIG.DATA_STALENESS_THRESHOLD_MS / 1000}s threshold)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataPipelineMonitor;
